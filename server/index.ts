// Импортируем улучшенный модуль подключения к базе данных
// Важно: мы проверим соединение с БД перед запуском сервера
import { testDatabaseConnection, db, queryWithRetry } from './db-selector';
import { databaseErrorHandler } from './middleware/databaseErrorHandler';

// Устанавливаем переменные окружения для SSL
process.env.PGSSLMODE = 'require';

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerNewRoutes } from "./routes-new"; // Импортируем новые маршруты
import { setupVite, serveStatic, log } from "./vite";
import { startBackgroundTasks } from "./background-tasks";
// Импортируем планировщик партиций
import { schedulePartitionCreation } from "./cron/partition-scheduler";
import { migrateRefCodes } from "./migrations/refCodeMigration";
// Импортируем наш новый модуль для обслуживания статических файлов в production
import { setupProductionStatic } from "./productionStatic";
// Импортируем middleware для стандартизации API ответов и обработки ошибок
import { responseFormatter } from "./middleware/responseFormatter";
import { errorHandler } from "./middleware/errorHandler";
// Импортируем селектор базы данных и принудительно устанавливаем Neon DB
import { dbType, DatabaseType, pool } from "./db-selector";
// Импортируем модули для работы с сессиями
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import memoryStore from 'memorystore';

// Принудительно устанавливаем Neon DB как провайдер базы данных
// Это переопределит любые настройки из файлов окружения
process.env.DATABASE_PROVIDER = 'neon';
process.env.FORCE_NEON_DB = 'true';
process.env.DISABLE_REPLIT_DB = 'true';
process.env.OVERRIDE_DB_PROVIDER = 'neon';
process.env.SKIP_PARTITION_CREATION = 'true';
process.env.IGNORE_PARTITION_ERRORS = 'true';

// Переопределяем обработчик необработанных исключений
process.on('uncaughtException', (error: Error) => {
  // Игнорируем ошибки партиционирования
  if (error.message && (
      error.message.includes('partitioned') || 
      error.message.includes('partition') ||
      error.message.includes('Failed to create partitions')
    )) {
    console.log('[Server] ⚠️ Игнорируем ошибку партиционирования:', error.message);
    return; // Не завершаем процесс при ошибке партиционирования
  }

  console.error('[Server] ❌ Необработанное исключение:', error);
  // Для других ошибок сохраняем стандартное поведение
  console.error(error.stack);
});

const app = express();
app.use(express.json());

// Создаем хранилище сессий
const MemoryStore = memoryStore(session);
// Настройка сессии с поддержкой PostgreSQL
const PgStore = connectPgSimple(session);

// Настраиваем сессионный middleware
app.use(session({
  store: process.env.USE_MEMORY_SESSION === 'true' 
    ? new MemoryStore({
        checkPeriod: 86400000 // Очистка устаревших сессий каждые 24 часа
      }) 
    : new PgStore({
        pool,
        tableName: 'session', // Имя таблицы для хранения сессий
        createTableIfMissing: true // Создаем таблицу, если она отсутствует
      }),
  secret: process.env.SESSION_SECRET || 'UniFarm_secret_key_change_in_production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Регистрируем middleware для проверки подключения к БД
app.use(databaseErrorHandler);
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
  console.log('[Server] 🔄 Запуск сервера...');

  // Проверяем подключение к базе данных перед запуском сервера
  console.log('[Server] 🔄 Проверка подключения к базе данных...');
  const isDbConnected = await testDatabaseConnection();

  if (!isDbConnected) {
    console.error('[Server] ❌ КРИТИЧЕСКАЯ ОШИБКА: Не удалось подключиться к базе данных!');
    console.error('[Server] 🔄 Попытка переподключения...');

    // Пробуем повторно подключиться с ожиданием
    const reconnected = await new Promise<boolean>(resolve => {
      setTimeout(async () => {
        try {
          const result = await testDatabaseConnection();
          resolve(result);
        } catch (error) {
          console.error('[Server] ❌ Ошибка при повторном подключении:', error);
          resolve(false);
        }
      }, 3000);
    });

    if (!reconnected) {
      console.error('[Server] ❌ КРИТИЧЕСКАЯ ОШИБКА: Не удалось подключиться к базе данных после повторных попыток!');
      console.error('[Server] ⚠️ Сервер продолжит запуск, но возможны ошибки в работе API!');
    } else {
      console.log('[Server] ✅ Подключение к базе данных восстановлено');
    }
  } else {
    console.log('[Server] ✅ Подключение к базе данных успешно установлено');
  }

  /**
   * Проверяем и применяем настройки базы данных.
   * Приоритеты выбора провайдера:
   * 1. FORCE_NEON_DB=true принудительно использует Neon DB
   * 2. USE_LOCAL_DB_ONLY=true принудительно использует Replit PostgreSQL
   * 3. В production режиме по умолчанию используется Neon DB
   * 4. В остальных случаях используется указанный DATABASE_PROVIDER или 'neon' по умолчанию
   */

  // Проверка явных флагов принудительного использования Neon DB
  const forceNeonDb = process.env.FORCE_NEON_DB === 'true';
  const disableReplitDb = process.env.DISABLE_REPLIT_DB === 'true';
  const overrideDbProvider = process.env.OVERRIDE_DB_PROVIDER === 'neon';
  const hasNeonDbUrl = process.env.DATABASE_URL?.includes('neon.tech');

  // Проверка явных флагов принудительного использования Replit DB
  const useLocalDbOnly = process.env.USE_LOCAL_DB_ONLY === 'true';

  // Проверка режима работы (продакшен или разработка)
  const isProduction = process.env.NODE_ENV === 'production';
  const hasReplitPgEnv = process.env.PGHOST === 'localhost' && process.env.PGUSER === 'runner';

  // Используем Neon DB по умолчанию согласно переменным окружения, 
  // установленным в начале файла
  console.log(`[DB] 🚀 ПРИНУДИТЕЛЬНОЕ ИСПОЛЬЗОВАНИЕ NEON DB (переменные окружения)`);

  // Выводим информацию о текущем провайдере базы данных
  console.log(`[DB] Текущий провайдер базы данных: ${dbType}`);

  // Проверяем наличие строки подключения к Neon DB
  if (!hasNeonDbUrl) {
    console.error(`
⚠️ КРИТИЧЕСКАЯ ОШИБКА: Принудительное использование Neon DB, но переменная DATABASE_URL не указывает на Neon DB!
Проверьте настройки или запустите приложение через start-with-neon.sh
    `);
  }

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
    // Получаем источник запроса
    const origin = req.headers.origin || '*';

    // Добавляем специальные заголовки для корректной работы в Telegram Mini App с поддержкой cookies
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-telegram-data, x-telegram-user-id");

    // Модифицированная политика безопасности для Telegram
    res.header("Content-Security-Policy", "default-src * 'self' data: blob: 'unsafe-inline' 'unsafe-eval'");

    // Для запросов OPTIONS возвращаем 200 OK
    if (req.method === 'OPTIONS') {
      return res.status(200).send();
    }

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
  // В настройках .replit внешний порт 80 маппится на внутренний порт 3000
  const port = parseInt(process.env.PORT || "3000", 10);
  console.log(`[Server] Starting on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);

  // Настройки для подключения уже установлены в db-connect-fix.js
  // и дополнительно не нужны здесь, так как уже применены при старте

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

      // Запуск планировщика партиций
      try {
        console.log('[Server] Инициализация планировщика партиций...');
        schedulePartitionCreation();
        console.log('[Server] Планировщик партиций успешно инициализирован');
      } catch (error) {
        console.error('[Server] Ошибка при инициализации планировщика партиций:', error);
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

  // Отдельный обработчик для корневого пути (health check)
  app.get('/', (req: Request, res: Response) => {
    return res.status(200).json({ status: 'ok', message: 'UniFarm API server is running' });
  });

  // Добавляем обработчик catch-all для остальных путей
  app.use('*', ((req: Request, res: Response) => {
    // Иначе статус 404
    return res.status(404).json({ status: 'error', message: 'Not found' });
  }) as any);

  // Централизованный обработчик ошибок
  app.use(((err: any, req: Request, res: Response, next: NextFunction) => errorHandler(err, req, res, next)) as any);

  // Explicit bind to 0.0.0.0 to ensure Replit deployment works correctly
  server.listen(port, "0.0.0.0", () => {
    console.log(`[Server] Server running at http://0.0.0.0:${port} in ${process.env.NODE_ENV || 'development'} mode`);
    log(`serving on port ${port}`);
    // Инициализируем фоновые сервисы после открытия порта
    initBackgroundServices();
  });
})();