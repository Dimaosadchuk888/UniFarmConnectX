/**
 * Централизованная конфигурация для всех модулей системы
 * Устраняет дублирование переменных окружения
 */

import { appConfig } from '../config/app';
import { supabaseConfig } from '../config/database';
import { telegramConfig } from '../config/telegram';

/**
 * Единая система переменных окружения
 * Устраняет дубликаты CORS_ORIGIN/CORS_ORIGINS, API_BASE_URL/VITE_API_BASE_URL
 */
export const envConfig = {
  // Унифицированные CORS настройки (CORS_ORIGINS как стандарт)
  corsOrigins: process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://t.me' : 'http://localhost:3000'),
  
  // Унифицированные API URLs (серверные и клиентские)
  api: {
    baseUrl: process.env.API_BASE_URL || '/api/v2',
    clientBaseUrl: process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || '/api/v2'
  },
  
  // Унифицированные Telegram настройки
  telegram: {
    webappName: process.env.TELEGRAM_WEBAPP_NAME || 'UniFarm',
    clientWebappName: process.env.VITE_TELEGRAM_WEBAPP_NAME || process.env.TELEGRAM_WEBAPP_NAME || 'UniFarm',
    botUsername: process.env.TELEGRAM_BOT_USERNAME || 'UniFarming_Bot',
    clientBotUsername: process.env.VITE_TELEGRAM_BOT_USERNAME || process.env.TELEGRAM_BOT_USERNAME || 'UniFarming_Bot'
  }
};

export const config = {
  app: appConfig,
  database: supabaseConfig,
  telegram: telegramConfig,
  env: envConfig,
  security: {
    cors: {
      origin: envConfig.corsOrigins,
      credentials: true
    }
  }
};