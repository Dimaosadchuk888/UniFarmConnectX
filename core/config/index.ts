/**
 * Централизованная конфигурация системы UniFarm
 */

import { appConfig } from '../../config/app';
import { databaseConfig } from '../../config/database';
import { telegramConfig } from '../../config/telegram';

export const config = {
  app: appConfig,
  database: databaseConfig,
  telegram: telegramConfig,
  
  // Настройки сервера
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // API конфигурация
  api: {
    version: 'v2',
    baseUrl: process.env.API_BASE_URL || '/api/v2',
    timeout: 30000,
  },

  // Безопасность
  security: {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || true,
      credentials: true,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 минут
      max: 100, // лимит запросов на IP
    },
  },
};

export default config;