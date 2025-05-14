import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerNewRoutes } from "./routes-new"; // Импортируем новые маршруты
import { setupVite, serveStatic, log } from "./vite";
import { startBackgroundTasks } from "./background-tasks";
import { migrateRefCodes } from "./migrations/refCodeMigration";
// Импортируем наш новый модуль для обслуживания статических файлов в production
import { setupProductionStatic } from "./productionStatic";
// Импортируем middleware для стандартизации API ответов и обработки ошибок
import { responseFormatter } from "./middleware/responseFormatter";
import { errorHandler } from "./middleware/errorHandler";
// Импортируем селектор базы данных и инициализируем подключение к БД Replit
import { setDatabaseProvider } from "./db-selector";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// Регистрируем middleware для стандартизации ответов API
app.use(responseFormatter as any);

app.use(((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
}) as any);

(async () => {
  // Устанавливаем использование Replit PostgreSQL по умолчанию
  setDatabaseProvider('replit');
  console.log('[DB] Инициализировано подключение к Replit PostgreSQL');
  
  /**
   * Глобальный обработчик необработанных исключений и отказов промисов
   * Это важно для предотвращения аварийного завершения приложения
   * при возникновении непредвиденных ошибок, что может привести к 502 ошибкам
   */
  process.on('uncaughtException', (error) => {
    console.error('[SERVER] ⚠️ Непойманное исключение:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    // Не завершаем процесс, чтобы сервер продолжил работу
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[SERVER] ⚠️ Необработанный отказ промиса:', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      timestamp: new Date().toISOString()
    });
    // Не завершаем процесс, чтобы сервер продолжил работу
  });
  
  /**
   * Дополнительные логи отладки запросов для изучения причин проблем 502
   */
  app.use(((req: Request, _res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) {
      console.log('[АУДИТ] [' + new Date().toISOString() + '] Request to ' + req.method + ' ' + req.url);
      console.log('[АУДИТ] Headers:', JSON.stringify(req.headers, null, 2));
    }
    next();
  }) as any);
  
  const server = await registerRoutes(app);
  
  // Регистрируем новые маршруты API, использующие новую архитектуру
  try {
    // Используем правильный импорт с обновленными контроллерами
    import('./routes-new')
      .then(module => {
        console.log('[Server] Начинаем регистрацию новых маршрутов API v2...');
        module.registerNewRoutes(app);
        console.log('[Server] ✅ Новые маршруты API v2 успешно зарегистрированы');
      })
      .catch(error => {
        console.error('[Server] Ошибка при регистрации новых маршрутов API:', error);
        console.log('[Server] Новые маршруты API v2 временно отключены из-за ошибки:', error.message);
      });
  } catch (error) {
    console.error('[Server] Ошибка при импорте новых маршрутов API:', error);
    console.log('[Server] Новые маршруты API v2 временно отключены из-за ошибки импорта');
  }

  // Регистрируем централизованный обработчик ошибок
  app.use(((err: any, req: Request, res: Response, next: NextFunction) => errorHandler(err, req, res, next)) as any);

  // Добавление обработчика для Telegram WebApp параметров
  app.use(((req: Request, res: Response, next: NextFunction) => {
    // Добавляем специальные заголовки для корректной работы в Telegram Mini App
    res.header("Access-Control-Allow-Origin", "*");
    // Модифицированная политика безопасности для Telegram
    res.header("Content-Security-Policy", "default-src * 'self' data: blob: 'unsafe-inline' 'unsafe-eval'");
    
    // Логирование параметров Telegram
    const telegramParams = ['tgWebAppData', 'tgWebAppVersion', 'tgWebAppPlatform', 'tgWebAppStartParam']
      .filter(param => req.query[param])
      .reduce((acc, param) => {
        acc[param] = req.query[param];
        return acc;
      }, {} as Record<string, any>);
      
    if (Object.keys(telegramParams).length > 0) {
      console.log('[TelegramWebApp] Параметры в URL:', telegramParams);
    }
    
    next();
  }) as any);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    console.log('[Server] Запуск в режиме разработки (development), используем Vite middleware');
    await setupVite(app, server);
  } else {
    console.log('[Server] Запуск в production режиме, используем оптимизированную обработку статических файлов');
    // Используем улучшенную версию обработки статических файлов для production
    setupProductionStatic(app);
    
    // Оригинальный метод остается закомментированным на случай проблем
    // serveStatic(app);
  }

  // В Replit при деплое необходимо слушать порт, указанный в переменной окружения PORT
  // или использовать порт 5000 для обеспечения совместимости с настройками Replit
  const port = parseInt(process.env.PORT || "5000", 10);
  console.log(`[Server] Starting on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
  
  // Для быстрого запуска сервера, переносим "тяжелые" операции в отдельные асинхронные процессы
  // Эти задачи будут выполняться после открытия порта
  function initBackgroundServices() {
    // Задержка инициализации тяжелых сервисов для обеспечения быстрого запуска
    setTimeout(() => {
      // Запуск фоновых задач
      startBackgroundTasks();
      
      // Запуск cron-задач для обслуживания базы данных
      try {
        // Импортируем и инициализируем модуль cron-задач после старта сервера
        import('./scripts/cron_scheduler.js')
          .then(module => {
            module.setupCronJobs();
            console.log('[Server] Cron-задачи успешно инициализированы');
          })
          .catch(error => {
            console.error('[Server] Ошибка при инициализации cron-задач:', error);
          });
      } catch (error) {
        console.error('[Server] Ошибка при импорте модуля cron-задач:', error);
      }
      
      // Обновление реферальных кодов
      try {
        migrateRefCodes()
          .then((result) => {
            console.log(`[Server] Миграция реферальных кодов успешно выполнена. Обновлено ${result.updated} из ${result.total} пользователей`);
          })
          .catch((error: Error) => {
            console.error('[Server] Ошибка при выполнении миграции реферальных кодов:', error);
          });
      } catch (error) {
        console.error('[Server] Ошибка при запуске миграции реферальных кодов:', error);
      }
    }, 100); // Небольшая задержка для приоритета открытия порта
  }
  
  // Запускаем сервер
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    // Инициализируем фоновые сервисы после открытия порта
    initBackgroundServices();
  });
})();
