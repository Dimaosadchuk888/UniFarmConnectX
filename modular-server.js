import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

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

// Middleware
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

// Создание сервера
async function createServer() {
  const app = express();

  // Базовые middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(corsMiddleware);
  app.use(loggerMiddleware);

  // API маршруты модулей (заглушки для тестирования)
  app.get(`/api/${config.app.apiVersion}/users/profile`, (req, res) => {
    res.json({ success: true, data: { message: 'User module active' } });
  });
  
  app.get(`/api/${config.app.apiVersion}/wallet/:userId/balance`, (req, res) => {
    res.json({ success: true, data: { message: 'Wallet module active', userId: req.params.userId } });
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: config.app.apiVersion,
      modules: ['user', 'wallet', 'referral', 'farming', 'missions', 'boost', 'telegram', 'dailyBonus', 'admin']
    });
  });

  // API endpoints для модулей
  app.get(`/api/${config.app.apiVersion}/modules`, (req, res) => {
    res.json({
      success: true,
      data: {
        modules: [
          { name: 'user', status: 'active', routes: ['/profile', '/:id', '/ref-code'] },
          { name: 'wallet', status: 'active', routes: ['/:userId/balance', '/:userId/transactions', '/withdraw'] },
          { name: 'referral', status: 'pending', routes: [] },
          { name: 'farming', status: 'pending', routes: [] },
          { name: 'missions', status: 'pending', routes: [] },
          { name: 'boost', status: 'pending', routes: [] },
          { name: 'telegram', status: 'pending', routes: [] },
          { name: 'dailyBonus', status: 'pending', routes: [] },
          { name: 'admin', status: 'pending', routes: [] }
        ]
      }
    });
  });

  // Статические файлы для frontend
  app.use(express.static(path.join(__dirname, 'client/dist')));

  // SPA fallback для React Router
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API endpoint not found' });
    } else {
      res.sendFile(path.join(__dirname, 'client/dist/index.html'));
    }
  });

  // Error handling middleware (должен быть последним)
  app.use(errorHandler);

  return app;
}

async function startServer() {
  try {
    console.log('🚀 Запуск UniFarm с модульной архитектурой...');
    
    const app = await createServer();
    
    const server = app.listen(config.app.port, config.app.host, () => {
      console.log(`✅ Сервер запущен на http://${config.app.host}:${config.app.port}`);
      console.log(`📡 API доступен: http://${config.app.host}:${config.app.port}/api/${config.app.apiVersion}/`);
      console.log(`🔧 Модули: http://${config.app.host}:${config.app.port}/api/${config.app.apiVersion}/modules`);
      console.log(`🌐 Frontend: http://${config.app.host}:${config.app.port}/`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Получен сигнал SIGTERM. Завершение работы сервера...');
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

// Запуск если это главный модуль
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { createServer, startServer };