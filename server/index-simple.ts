/**
 * Простая точка входа UniFarm с корректной интеграцией Vite
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';
import routes from './routes.js';

async function startServer() {
  try {
    const app = express();
    const apiPrefix = '/api/v2';
    const apiPort = config.app.port;

    // Middleware
    app.use(cors(config.security.cors));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Health check
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // API routes
    app.use(apiPrefix, routes);

    // Development mode with Vite
    if (process.env.NODE_ENV !== 'production') {
      const { setupVite } = await import('./vite-simple.js');
      
      const server = app.listen(apiPort, config.app.host, async () => {
        logger.info(`🚀 API сервер запущен на http://${config.app.host}:${apiPort}`);
        logger.info(`📡 API доступен: http://${config.app.host}:${apiPort}${apiPrefix}/`);
        logger.info(`🌐 Frontend: http://${config.app.host}:${apiPort}/ (Vite dev server)`);
        
        // Setup Vite middleware
        await setupVite(app, server);
      });
      
      return server;
    } else {
      // Production mode
      app.use(express.static(path.join(process.cwd(), 'dist/public')));
      
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
          return next();
        }
        res.sendFile(path.join(process.cwd(), 'dist/public/index.html'));
      });
      
      const server = app.listen(apiPort, config.app.host, () => {
        logger.info(`🚀 Production сервер запущен на http://${config.app.host}:${apiPort}`);
        logger.info(`📡 API доступен: http://${config.app.host}:${apiPort}${apiPrefix}/`);
        logger.info(`🌐 Frontend: http://${config.app.host}:${apiPort}/`);
      });
      
      return server;
    }
  } catch (error) {
    logger.error('Критическая ошибка запуска сервера', { error: (error as Error).message });
    process.exit(1);
  }
}

// Start server
startServer().catch((error) => {
  logger.error('Неудачный запуск сервера', { error: error.message });
  process.exit(1);
});