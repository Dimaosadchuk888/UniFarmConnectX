import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from './config';
import { initDatabase } from './db';
import { corsMiddleware, loggerMiddleware, errorHandler } from './middleware';
import { telegramMiddleware } from '../modules';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Импорт модулей
import { 
  userRoutes, 
  walletRoutes, 
  farmingRoutes,
  missionsRoutes,
  telegramRoutes,
  referralRoutes,
  boostRoutes,
  dailyBonusRoutes,
  adminRoutes,
  authRoutes
} from '../modules';

export async function createServer() {
  const app = express();

  // Инициализация базы данных
  await initDatabase();

  // Базовые middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(corsMiddleware);
  app.use(loggerMiddleware);
  
  // Telegram middleware для обработки initData
  app.use('/api', telegramMiddleware);

  // API маршруты
  app.use(`/api/${config.app.apiVersion}/auth`, authRoutes);
  app.use(`/api/${config.app.apiVersion}/users`, userRoutes);
  app.use(`/api/${config.app.apiVersion}/wallet`, walletRoutes);
  app.use(`/api/${config.app.apiVersion}/farming`, farmingRoutes);
  app.use(`/api/${config.app.apiVersion}/missions`, missionsRoutes);
  app.use(`/api/${config.app.apiVersion}/referral`, referralRoutes);
  app.use(`/api/${config.app.apiVersion}/boost`, boostRoutes);
  app.use(`/api/${config.app.apiVersion}/daily-bonus`, dailyBonusRoutes);
  app.use(`/api/${config.app.apiVersion}/telegram`, telegramRoutes);
  app.use(`/api/${config.app.apiVersion}/admin`, adminRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: config.app.apiVersion 
    });
  });

  // Расширенный health check для проверки модулей
  app.get('/api/v2/status', (req, res) => {
    const modules = [
      'auth', 'users', 'wallet', 'farming', 'missions', 
      'referral', 'boost', 'daily-bonus', 'telegram', 'admin'
    ];
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      version: config.app.apiVersion,
      environment: process.env.NODE_ENV || 'development',
      modules: modules.map(module => ({
        name: module,
        endpoint: `/api/v2/${module}`,
        status: 'registered'
      })),
      database: 'connected',
      telegram_bot: process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'missing'
    });
  });

  // Статические файлы для frontend
  app.use(express.static(path.join(__dirname, '../client/dist')));

  // SPA fallback для React Router
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API endpoint not found' });
    } else {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    }
  });

  // Error handling middleware (должен быть последним)
  app.use(errorHandler);

  return app;
}

export async function startServer() {
  try {
    const app = await createServer();
    
    const server = app.listen(config.app.port, config.app.host, () => {
      console.log(`🚀 Сервер запущен на http://${config.app.host}:${config.app.port}`);
      console.log(`📡 API доступен: http://${config.app.host}:${config.app.port}/api/${config.app.apiVersion}/`);
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