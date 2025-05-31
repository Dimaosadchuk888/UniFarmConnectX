#!/usr/bin/env node

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Конфигурация
const config = {
  app: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    apiVersion: 'v2'
  },
  security: {
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*']
  }
};

// Core middleware
function corsMiddleware(req, res, next) {
  const allowedOrigins = config.security.corsOrigins;
  const origin = req.headers.origin;

  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}

function loggerMiddleware(req, res, next) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
}

function errorHandler(err, req, res, next) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Error in ${req.method} ${req.url}:`, err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Внутренняя ошибка сервера',
    timestamp
  });
}

// Импорт модулей
async function importModules() {
  try {
    const { 
      UserController, 
      WalletController, 
      FarmingController, 
      MissionsController, 
      TelegramController 
    } = await import('./modules/index.js');
    
    const { telegramMiddleware } = await import('./modules/telegram/middleware.js');
    
    return {
      UserController,
      WalletController, 
      FarmingController,
      MissionsController,
      TelegramController,
      telegramMiddleware
    };
  } catch (error) {
    console.error('Ошибка импорта модулей:', error);
    // Fallback к простой реализации
    return null;
  }
}

// Создание сервера
async function createServer() {
  const app = express();

  // Базовые middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(corsMiddleware);
  app.use(loggerMiddleware);

  // Попытка загрузки модулей
  const modules = await importModules();
  
  if (modules) {
    console.log('📦 Модули загружены успешно');
    
    // Telegram middleware
    app.use(modules.telegramMiddleware);
    
    // Инициализация контроллеров
    const userController = new modules.UserController();
    const walletController = new modules.WalletController();
    const farmingController = new modules.FarmingController();
    const missionsController = new modules.MissionsController();
    const telegramController = new modules.TelegramController();

    // API маршруты модулей
    app.get(`/api/${config.app.apiVersion}/me`, userController.getCurrentUser.bind(userController));
    app.post(`/api/${config.app.apiVersion}/users/generate-refcode`, userController.generateRefCode.bind(userController));
    app.get(`/api/${config.app.apiVersion}/wallet`, walletController.getWalletData.bind(walletController));
    app.get(`/api/${config.app.apiVersion}/farming`, farmingController.getFarmingData.bind(farmingController));
    app.get(`/api/${config.app.apiVersion}/missions/active`, missionsController.getActiveMissions.bind(missionsController));
    app.get(`/api/${config.app.apiVersion}/telegram/debug`, telegramController.debugMiddleware.bind(telegramController));
    
  } else {
    console.log('⚠️ Модули недоступны, используется fallback режим');
    
    // Fallback Telegram middleware
    app.use((req, res, next) => {
      req.telegram = {
        user: {
          id: 12345,
          telegram_id: '12345',
          username: 'test_user',
          first_name: 'Test',
          ref_code: 'TEST123',
          uni_balance: 1000,
          ton_balance: 0.1
        },
        validated: true
      };
      next();
    });

    // Fallback API endpoints
    app.get(`/api/${config.app.apiVersion}/me`, (req, res) => {
      res.json({
        success: true,
        data: {
          id: 12345,
          telegram_id: '12345',
          username: 'test_user',
          first_name: 'Test',
          ref_code: 'TEST123',
          uni_balance: 1000,
          ton_balance: 0.1,
          created_at: new Date().toISOString(),
          is_telegram_user: true,
          auth_method: 'telegram'
        }
      });
    });
  }

  // Системные endpoints
  app.get(`/api/${config.app.apiVersion}/status`, (req, res) => {
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        status: 'modular',
        version: '2.0',
        modules: modules ? 'active' : 'fallback',
        timestamp: new Date().toISOString()
      }
    });
  });

  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: config.app.apiVersion,
      architecture: 'modular',
      modules: modules ? 'loaded' : 'fallback'
    });
  });

  // Статические файлы для frontend
  app.use(express.static(path.join(__dirname, 'client/dist')));

  // SPA fallback для React Router
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API endpoint not found' });
    } else {
      const indexPath = path.join(__dirname, 'client/dist/index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          res.status(404).send('Frontend not built');
        }
      });
    }
  });

  // Error handling middleware
  app.use(errorHandler);

  return app;
}

// Запуск сервера
async function startServer() {
  try {
    console.log('🚀 Запуск UniFarm с модульной архитектурой...');
    
    const app = await createServer();
    
    const server = app.listen(config.app.port, config.app.host, () => {
      console.log(`✅ UniFarm запущен на http://${config.app.host}:${config.app.port}`);
      console.log(`📡 API: http://${config.app.host}:${config.app.port}/api/${config.app.apiVersion}/`);
      console.log(`🌐 Frontend: http://${config.app.host}:${config.app.port}/`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Получен сигнал SIGTERM. Завершение работы...');
      server.close(() => {
        console.log('Сервер завершил работу');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
  console.error('🚨 Необработанное исключение:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Необработанное отклонение промиса:', reason);
  process.exit(1);
});

// Запуск если это главный модуль
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { createServer, startServer };