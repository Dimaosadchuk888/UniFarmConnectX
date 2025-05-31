import express from 'express';
import path from 'path';
import { config } from './config';
import { initDatabase } from './db';
import { corsMiddleware, loggerMiddleware, errorHandler } from './middleware';

// Импорт модулей
import { userRoutes, walletRoutes } from '../modules';

export async function createServer() {
  const app = express();

  // Инициализация базы данных
  await initDatabase();

  // Базовые middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(corsMiddleware);
  app.use(loggerMiddleware);

  // API маршруты
  app.use(`/api/${config.app.apiVersion}/users`, userRoutes);
  app.use(`/api/${config.app.apiVersion}/wallet`, walletRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: config.app.apiVersion 
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