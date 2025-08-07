/**
 * Централизованная конфигурация для всех модулей системы
 * Устраняет дублирование переменных окружения
 */

import { appConfig, validateRequiredEnvVars } from '../config/app';
import { supabaseConfig, validateDatabaseConfig } from '../config/database';
import { telegramConfig, validateTelegramConfig } from '../config/telegram';
import { validateSupabaseConfig } from './supabase';

/**
 * Единая система переменных окружения
 * Унифицированная система без дубликатов переменных
 */
export const envConfig = {
  // Унифицированные CORS настройки (CORS_ORIGINS как стандарт)
  corsOrigins: process.env.CORS_ORIGINS || (process.env.NODE_ENV === 'production' ? 'https://t.me' : 'http://localhost:3000'),
  
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

// Функция для валидации всех конфигураций
export const validateConfig = () => {
  validateRequiredEnvVars();
  validateDatabaseConfig();
  validateTelegramConfig();
  // Supabase валидация не нужна, так как клиент создается с реальными данными
};