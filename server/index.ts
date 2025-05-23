// Загружаем переменные окружения из файла .env
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Проверяем, существует ли файл .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log('[Config] Loading environment variables from:', envPath);
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.error('[Config] Error loading .env file:', result.error);
  } else {
    console.log('[Config] Environment variables loaded successfully');
  }
} else {
  console.error('[Config] .env file not found at:', envPath);
}

// Добавим URL-ы для Telegram бота напрямую
if (!process.env.APP_URL) {
  process.env.APP_URL = 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app';
  console.log('[Config] Setting APP_URL manually:', process.env.APP_URL);
}

if (!process.env.MINI_APP_URL) {
  process.env.MINI_APP_URL = 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app';
  console.log('[Config] Setting MINI_APP_URL manually:', process.env.MINI_APP_URL);
}

if (!process.env.TELEGRAM_WEBHOOK_URL) {
  process.env.TELEGRAM_WEBHOOK_URL = 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app/api/telegram/webhook';
  console.log('[Config] Setting TELEGRAM_WEBHOOK_URL manually:', process.env.TELEGRAM_WEBHOOK_URL);
}

// Логируем важные настройки Telegram для отладки
console.log('[Telegram Config] APP_URL:', process.env.APP_URL);
console.log('[Telegram Config] MINI_APP_URL:', process.env.MINI_APP_URL);
console.log('[Telegram Config] TELEGRAM_WEBHOOK_URL:', process.env.TELEGRAM_WEBHOOK_URL);

// Устанавливаем переменные окружения для SSL
process.env.PGSSLMODE = 'require';

// Принудительно устанавливаем Neon DB как провайдер базы данных
process.env.DATABASE_PROVIDER = 'neon';
process.env.FORCE_NEON_DB = 'true';
process.env.DISABLE_REPLIT_DB = 'true';
process.env.OVERRIDE_DB_PROVIDER = 'neon';
process.env.SKIP_PARTITION_CREATION = 'true';
process.env.IGNORE_PARTITION_ERRORS = 'true';

// Импорты для работы с Express и базовыми модулями
import express, { 
  type Request, 
  type Response, 
  type NextFunction, 
  Router,
  type RequestHandler,
  type ErrorRequestHandler 
} from "express";
import http from 'http';
import { WebSocketServer } from 'ws';

// Импорты для работы с базой данных
import { testConnection, db, queryWithRetry, dbType, pool } from './db-connect-unified';
import { DatabaseType } from "./db-config";

// Импорты middleware и обработчиков
import { databaseErrorHandler } from './middleware/databaseErrorHandler';
import { healthCheckMiddleware } from './middleware/health-check';
import { responseFormatter } from "./middleware/responseFormatter";
import { errorHandler } from "./middleware/errorHandler";

// Импорты для маршрутизации и статических файлов
import { registerNewRoutes } from "./routes-new";
import { setupVite, serveStatic, log } from "./vite";
import { setupProductionStatic } from "./productionStatic";

// Импорты для фоновых задач и миграций
import { startBackgroundTasks } from "./background-tasks";
import { schedulePartitionCreation } from "./cron/partition-scheduler";
import { migrateRefCodes } from "./migrations/refCodeMigration";

// Импорт для настройки Telegram
import { setupTelegramHook } from './telegram/setup-hook';

// Импорты для логирования
import logger from './utils/logger';

// Импорты для сессий
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import memoryStore from 'memorystore';

// Переопределяем обработчик необработанных исключений
process.on('uncaughtException', (error: Error) => {
  // Игнорируем ошибки партиционирования
  if (error.message && (
      error.message.includes('partitioned') || 
      error.message.includes('partition') ||
      error.message.includes('Failed to create partitions')
    )) {
    logger.warn('[Server] Игнорируем ошибку партиционирования:', error.message);
    return; // Не завершаем процесс при ошибке партиционирования
  }

  logger.error('[Server] Необработанное исключение:', error);
});

// Глобальный обработчик необработанных отказов промисов
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('[SERVER] Необработанный отказ промиса:', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    timestamp: new Date().toISOString()
  });
  
  // Логируем более подробную информацию для отладки
  if (reason instanceof Error) {
    logger.error('[SERVER] Детали ошибки:', {
      name: reason.name,
      message: reason.message,
      stack: reason.stack,
      time: new Date().toISOString()
    });
  }
});

/**
 * Основная функция для запуска сервера
 */
async function startServer(): Promise<void> {
  logger.info('[Server] 🔄 Запуск сервера...');

  // Проверяем подключение к базе данных перед запуском сервера
  logger.info('[Server] 🔄 Проверка подключения к базе данных...');
  const isDbConnected = await testConnection();

  if (!isDbConnected) {
    logger.error('[Server] ❌ КРИТИЧЕСКАЯ ОШИБКА: Не удалось подключиться к базе данных!');
    logger.info('[Server] 🔄 Попытка переподключения...');

    // Пробуем повторно подключиться с ожиданием
    const reconnected = await new Promise<boolean>(resolve => {
      setTimeout(async () => {
        try {
          const result = await testConnection();
          resolve(result);
        } catch (error) {
          logger.error('[Server] ❌ Ошибка при повторном подключении:', error);
          resolve(false);
        }
      }, 3000);
    });

    if (!reconnected) {
      logger.error('[Server] ❌ КРИТИЧЕСКАЯ ОШИБКА: Не удалось подключиться к базе данных после повторных попыток!');
      logger.warn('[Server] ⚠️ Сервер продолжит запуск, но возможны ошибки в работе API!');
    } else {
      logger.info('[Server] ✅ Подключение к базе данных восстановлено');
    }
  } else {
    logger.info('[Server] ✅ Подключение к базе данных успешно установлено');
  }

  // Создаем Express приложение
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Создаем хранилище сессий
  const MemoryStore = memoryStore(session);
  const PgStore = connectPgSimple(session);
  
  // Настраиваем сессионный middleware
  app.use(session({
    store: process.env.USE_MEMORY_SESSION === 'true' 
      ? new MemoryStore({
          checkPeriod: 86400000 // Очистка устаревших сессий каждые 24 часа
        }) 
      : new PgStore({
          pool: pool as any, // Временное приведение типа для совместимости с connect-pg-simple
          tableName: 'session',
          createTableIfMissing: true
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
  app.use(databaseErrorHandler as unknown as RequestHandler);
  
  // Регистрируем middleware для проверки здоровья приложения
  app.use(healthCheckMiddleware as express.RequestHandler);
  
  // Регистрируем middleware для стандартизации ответов API
  app.use(responseFormatter as any);

  // Middleware для логирования API запросов
  const apiLoggingMiddleware: RequestHandler = (req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson: any) {
      capturedJsonResponse = bodyJson;
      return originalResJson.call(res, bodyJson);
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
  };
  
  app.use('/api', apiLoggingMiddleware);

  // Дополнительные логи отладки запросов
  if (process.env.DEBUG_API_REQUESTS === 'true') {
    const debugMiddleware: RequestHandler = (req, _res, next) => {
      if (req.path.startsWith('/api/')) {
        logger.debug('[АУДИТ] [' + new Date().toISOString() + '] Request to ' + req.method + ' ' + req.url);
        logger.debug('[АУДИТ] Headers:', JSON.stringify(req.headers, null, 2));
      }
      next();
    };
    
    app.use('/api', debugMiddleware);
  }

  // Создаем отдельный роутер для маршрутов здоровья
  const healthRouter = Router();

  // Добавляем специальный маршрут для проверки здоровья
  const healthHandler = (req: Request, res: Response): Response => {
    logger.debug('[Health Check] Запрос к /health эндпоинту');
    return res.status(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  };
  
  healthRouter.get('/health', healthHandler as any);

  // Добавляем обработчик корневого маршрута для проверки здоровья
  const rootHealthHandler = (req: Request, res: Response) => {
    logger.debug('[Health Check] Запрос к корневому маршруту');
    
    // Если это запрос для проверки здоровья от Replit
    if (req.query.health === 'check' || 
        req.headers['user-agent']?.includes('Replit') || 
        req.headers['x-replit-deployment-check']) {
      logger.info('[Health Check] Replit проверка здоровья обнаружена');
      return res.status(200).send('OK');
    }
    
    // Иначе, для обычных запросов возвращаем HTML страницу
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>UniFarm API</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>UniFarm API</h1>
          <p>API сервер работает. Используйте Telegram для доступа к UniFarm.</p>
          <p>Время сервера: ${new Date().toISOString()}</p>
        </body>
      </html>
    `);
  };
  
  healthRouter.get('/', rootHealthHandler as any);

  // Подключаем роутер с маршрутами здоровья
  app.use('/', healthRouter);

  // Добавление обработчика для Telegram WebApp параметров
  const telegramWebAppMiddleware: RequestHandler = (req, res, next) => {
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
      logger.debug('[TelegramWebApp] Параметры в URL:', telegramParams);
    }

    next();
  };
  
  app.use(telegramWebAppMiddleware);

  // Создаем HTTP сервер на основе Express приложения
  const server = http.createServer(app);
  
  // Настройка WebSocket сервера
  const wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => {
    // Обрабатываем только критические ошибки соединения
    ws.on('error', (error: Error) => {
      logger.error(`[WebSocket] Ошибка соединения:`, error.message);
    });
  });
  
  // Регистрируем консолидированные маршруты API
  try {
    // Регистрируем консолидированные маршруты
    registerNewRoutes(app);
    
    // Настраиваем базовый URL для API
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.PRODUCTION_URL || 'https://uni-farm.app') 
      : 'https://uni-farm-connect-2.osadchukdmitro2.replit.app';
      
    logger.info('[Server] ✅ API маршруты успешно настроены');
  } catch (error) {
    logger.error('[Server] ❌ Ошибка при настройке маршрутов API:', 
      error instanceof Error ? error.message : String(error));
  }

  // Регистрируем централизованный обработчик ошибок
  const centralErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
    errorHandler(err, req, res, next);
  };
  
  app.use(centralErrorHandler);

  // Добавляем health check endpoint перед статическими файлами
  const mainHealthHandler = (req: Request, res: Response) => {
    logger.debug('[Health Check] Запрос к health endpoint');
    return res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  };
  
  app.get('/health', mainHealthHandler as any);

  // Настраиваем обработку статических файлов в зависимости от окружения
  if (app.get("env") === "development") {
    logger.info('[Server] 🔧 Запуск в режиме разработки (development), используем Vite middleware');
    await setupVite(app, server);
  } else {
    logger.info('[Server] 🚀 Запуск в production режиме, используем оптимизированную обработку статических файлов');
    setupProductionStatic(app);
  }
  
  // Еще раз регистрируем централизованный обработчик ошибок
  const finalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
    errorHandler(err, req, res, next);
  };
  
  app.use(finalErrorHandler);

  // В Replit при деплое необходимо слушать порт, указанный в переменной окружения PORT
  const port = parseInt(process.env.PORT || "3000", 10);
  logger.info(`[Server] Starting on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);

  // Запускаем сервер
  server.listen(port, "0.0.0.0", () => {
    logger.info(`[Server] 🚀 Сервер успешно запущен на порту ${port}`);
    
    // После запуска сервера автоматически настраиваем Telegram вебхук
    if (process.env.TELEGRAM_BOT_TOKEN) {
      logger.info('[Server] Запуск автоматической настройки Telegram бота...');
      setupTelegramHook().catch(error => {
        logger.error('[Server] Ошибка при настройке Telegram вебхука:', error);
        logger.info('[Server] Настройку Telegram бота можно выполнить вручную через /api/telegram/setup');
      });
    } else {
      logger.warn('[Server] TELEGRAM_BOT_TOKEN не найден, автоматическая настройка вебхука пропущена');
    }
    
    // Инициализируем фоновые сервисы
    initBackgroundServices();
  });
}

/**
 * Инициализирует фоновые сервисы
 */
function initBackgroundServices(): void {
  // Задержка инициализации тяжелых сервисов для обеспечения быстрого запуска
  setTimeout(() => {
    // Инициализация системы автоматического восстановления соединения с БД
    try {
      const { initDbAutoRecovery } = require('./utils/db-auto-recovery');
      initDbAutoRecovery({
        initialBackoff: 5000,         // 5 секунд начальная задержка
        maxBackoff: 300000,           // Максимум 5 минут между попытками
        backoffFactor: 1.5,           // Увеличение задержки в 1.5 раза при каждой неудаче
        resetThreshold: 600000,       // Сброс счетчика неудач после 10 минут успешной работы
        maxConsecutiveFailures: 5     // Максимум 5 последовательных неудач
      });
      logger.info('[Server] ✅ Система автоматического восстановления БД инициализирована');
    } catch (error) {
      logger.error('[Server] ❌ Ошибка при инициализации системы автоматического восстановления БД:', 
        error instanceof Error ? error.message : String(error));
    }

    // Запуск фоновых задач
    startBackgroundTasks();

    // Запуск cron-задач для обслуживания базы данных
    try {
      // Импортируем и инициализируем модуль cron-задач после старта сервера
      import('./scripts/cron_scheduler.js')
        .then(module => {
          module.setupCronJobs();
          logger.info('[Server] Cron-задачи успешно инициализированы');
        })
        .catch(error => {
          logger.error('[Server] Ошибка при инициализации cron-задач:', error);
        });
    } catch (error) {
      logger.error('[Server] Ошибка при импорте модуля cron-задач:', error);
    }

    // Запуск планировщика партиций
    try {
      if (process.env.SKIP_PARTITION_CREATION !== 'true') {
        logger.info('[Server] Инициализация планировщика партиций...');
        schedulePartitionCreation();
        logger.info('[Server] Планировщик партиций успешно инициализирован');
      } else {
        logger.info('[Server] Планировщик партиций пропущен (SKIP_PARTITION_CREATION=true)');
      }
    } catch (error) {
      logger.error('[Server] Ошибка при инициализации планировщика партиций:', error);
    }

    // Обновление реферальных кодов
    try {
      migrateRefCodes()
        .then((result) => {
          logger.info(`[Server] Миграция реферальных кодов завершена: ${result.total} обработано, ${result.updated} обновлено`);
        })
        .catch((error) => {
          logger.error('[Server] Ошибка при миграции реферальных кодов:', error);
        });
    } catch (error) {
      logger.error('[Server] Ошибка при запуске миграции реферальных кодов:', error);
    }
  }, 5000);
}

// Запускаем сервер
startServer().catch(error => {
  logger.error('[Server] Критическая ошибка при запуске сервера:', error);
  // Логируем ошибку, но не завершаем процесс
  logger.info('[Server] Сервер продолжит работу, несмотря на ошибку при инициализации');
});

// Создаем интервал, чтобы процесс не завершался
setInterval(() => {
  logger.debug('[Server] Heartbeat check - server is still running');
}, 1000 * 60 * 5); // Проверка каждые 5 минут