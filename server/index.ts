/**
 * Главная точка входа UniFarm
 * Запускает сервер с интеграцией всех модулей
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { config, logger, globalErrorHandler, notFoundHandler } from '../core';
import { db } from '../core/db';

// Импорт всех модулей
import userRoutes from '../modules/user/routes';
import walletRoutes from '../modules/wallet/routes';
import farmingRoutes from '../modules/farming/routes';
import missionsRoutes from '../modules/missions/routes';
import boostRoutes from '../modules/boost/routes';
import referralRoutes from '../modules/referral/routes';
import telegramRoutes from '../modules/telegram/routes';
import authRoutes from '../modules/auth/routes';
import adminRoutes from '../modules/admin/routes';
import dailyBonusRoutes from '../modules/dailyBonus/routes';

async function startServer() {
  try {
    const app = express();

    // Middleware
    app.use(cors({
      origin: config.security.corsOrigins,
      credentials: true
    }));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Логирование запросов
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.request(req.method, req.originalUrl, res.statusCode, duration);
      });
      next();
    });

    // Health check (должен быть первым для мониторинга)
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: config.app.apiVersion,
        environment: config.app.nodeEnv
      });
    });

    // API routes
    const apiPrefix = `/api/${config.app.apiVersion}`;
    app.use(`${apiPrefix}/users`, userRoutes);
    app.use(`${apiPrefix}/wallet`, walletRoutes);
    app.use(`${apiPrefix}/farming`, farmingRoutes);
    app.use(`${apiPrefix}/missions`, missionsRoutes);
    app.use(`${apiPrefix}/boost`, boostRoutes);
    app.use(`${apiPrefix}/referral`, referralRoutes);
    app.use(`${apiPrefix}/telegram`, telegramRoutes);
    app.use(`${apiPrefix}/auth`, authRoutes);
    app.use(`${apiPrefix}/admin`, adminRoutes);
    app.use(`${apiPrefix}/daily-bonus`, dailyBonusRoutes);

    // Статические файлы React фронтенда
    app.use(express.static('dist/public'));

    // SPA routing - направляем только non-API маршруты на React приложение
    app.get('*', (req, res, next) => {
      // Пропускаем API запросы, они должны возвращать 404 если не найдены
      if (req.path.startsWith('/api/')) {
        return next();
      }
      // Отправляем React приложение для всех остальных маршрутов
      res.sendFile(path.join(process.cwd(), 'dist/public/index.html'));
    });

    // Обработка ошибок
    app.use(notFoundHandler);
    app.use(globalErrorHandler);

    // Запуск сервера
    const server = app.listen(config.app.port, config.app.host, () => {
      logger.info(`🚀 Сервер запущен на http://${config.app.host}:${config.app.port}`);
      logger.info(`📡 API доступен: http://${config.app.host}:${config.app.port}${apiPrefix}/`);
      logger.info(`🌐 Frontend: http://${config.app.host}:${config.app.port}/`);
    });

    return server;
  } catch (error) {
    logger.error('Критическая ошибка запуска сервера', { error: error.message });
    throw error;
  }
}

// Запуск сервера
startServer()
  .then(() => {
    logger.info('✅ UniFarm сервер успешно запущен');
  })
  .catch((error) => {
    logger.error('❌ Критическая ошибка запуска сервера', { error: error.message });
    process.exit(1);
  });