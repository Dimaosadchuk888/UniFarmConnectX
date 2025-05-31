// Упрощенный сервер UniFarm без дублированной архитектуры
console.log('🎯 [SYSTEM] Запуск упрощенного UniFarm сервера');

// Environment setup
if (!process.env.APP_URL) {
  process.env.APP_URL = 'https://uni-farm-connect-xo-osadchukdmitro2.replit.app';
}

if (!process.env.MINI_APP_URL) {
  process.env.MINI_APP_URL = 'https://uni-farm-connect-xo-osadchukdmitro2.replit.app';
}

// SSL setup
process.env.PGSSLMODE = 'require';
process.env.DATABASE_PROVIDER = 'neon';

import express, { Express, Request, Response, RequestHandler } from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';

// Стабильный Telegram middleware
import { stableTelegramMiddleware } from './telegram/stable-middleware';

// Чистые маршруты API
import { registerCleanRoutes } from "./routes-clean";
import { setupVite, serveStatic, log } from "./vite";

// Сессии
import session from 'express-session';
import memoryStore from 'memorystore';

// Простое логирование
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  debug: (msg: string, data?: any) => console.log(`[DEBUG] ${msg}`, data || '')
};

// Обработчик ошибок
process.on('uncaughtException', (error: Error) => {
  if (error.message.includes('partition') || error.message.includes('PARTITION')) {
    logger.debug('Игнорируем ошибку партиционирования:', error.message);
    return;
  }
  logger.error('Необработанная ошибка:', error.message);
});

process.on('unhandledRejection', (reason: any) => {
  if (reason?.message?.includes('partition')) {
    logger.debug('Игнорируем отклонение партиционирования:', reason.message);
    return;
  }
  logger.error('Необработанное отклонение:', reason);
});

// Создание и настройка Express приложения
async function createApp(): Promise<Express> {
  const app = express();

  // Базовые middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Настройка сессий с MemoryStore
  const MemoryStore = memoryStore(session);
  
  app.use(session({
    store: new MemoryStore({
      checkPeriod: 86400000 // 24 часа
    }),
    secret: process.env.SESSION_SECRET || 'unifarm-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 часа
    }
  }));

  // CORS для Telegram Mini App
  const corsMiddleware: RequestHandler = (req, res, next) => {
    const origin = req.headers.origin || '*';
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-telegram-data, x-telegram-user-id, x-telegram-init-data");
    res.header("Content-Security-Policy", "default-src * 'self' data: blob: 'unsafe-inline' 'unsafe-eval'");

    if (req.method === 'OPTIONS') {
      return res.status(200).send();
    }
    next();
  };

  app.use(corsMiddleware);

  // Стабильный Telegram middleware
  app.use(stableTelegramMiddleware);

  // Базовые эндпоинты
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '3.0-simplified'
    });
  });

  // Простая проверка статуса
  app.get('/api/status', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'running',
        version: '3.0-simplified',
        timestamp: new Date().toISOString()
      }
    });
  });

  // Регистрируем чистые API маршруты
  registerCleanRoutes(app);

  // Подключаем Vite для обслуживания фронтенда
  if (process.env.NODE_ENV === 'production') {
    // В продакшене обслуживаем статические файлы
    app.use(express.static('./client/dist'));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile('index.html', { root: './client/dist' });
      }
    });
  } else {
    // В разработке используем Vite
    const { setupVite } = await import('./vite.js');
    await setupVite(app, server);
  }

  // Telegram маршруты (упрощенные)
  app.get('/api/telegram/status', (req, res) => {
    const hasBotToken = Boolean(process.env.TELEGRAM_BOT_TOKEN);
    res.json({
      success: true,
      data: {
        hasToken: hasBotToken,
        status: hasBotToken ? 'configured' : 'missing_token',
        timestamp: new Date().toISOString()
      }
    });
  });

  // Обработчик ошибок
  app.use((error: any, req: Request, res: Response, next: any) => {
    logger.error('Ошибка Express:', error.message);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера',
        timestamp: new Date().toISOString()
      });
    }
  });

  return app;
}

// Создание HTTP сервера
async function createServer(): Promise<http.Server> {
  const app = await createApp();
  const server = http.createServer(app);

  // WebSocket сервер (упрощенный)
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });

  wss.on('connection', (ws, req) => {
    logger.info('WebSocket подключение установлено');
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        logger.debug('WebSocket сообщение:', message);
        
        // Простой эхо ответ
        ws.send(JSON.stringify({
          type: 'echo',
          data: message,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        logger.error('Ошибка WebSocket сообщения:', error);
      }
    });

    ws.on('close', () => {
      logger.info('WebSocket соединение закрыто');
    });

    ws.on('error', (error) => {
      logger.error('Ошибка WebSocket:', error);
    });
  });

  // Настройка Vite для статических файлов
  await setupVite(app, server);

  return server;
}

// Запуск сервера
async function startServer() {
  try {
    const server = await createServer();
    const PORT = process.env.PORT || 3000;

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 UniFarm сервер запущен на порту ${PORT}`);
      logger.info(`📱 Mini App URL: ${process.env.MINI_APP_URL}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('Получен SIGTERM, закрываем сервер...');
      server.close(() => {
        logger.info('Сервер закрыт');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Критическая ошибка запуска сервера:', error);
    process.exit(1);
  }
}

// Запуск приложения
startServer().catch((error) => {
  logger.error('Фатальная ошибка:', error);
  process.exit(1);
});