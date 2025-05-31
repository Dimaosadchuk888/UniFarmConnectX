import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

export const config = {
  // Основные настройки приложения
  app: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    apiVersion: 'v2'
  },

  // База данных
  database: {
    url: process.env.DATABASE_URL || '',
    provider: process.env.DATABASE_PROVIDER || 'neon',
    ssl: process.env.NODE_ENV === 'production',
    maxConnections: 20,
    connectionTimeout: 30000
  },

  // Telegram
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
    webAppUrl: process.env.TELEGRAM_WEBAPP_URL || '',
    apiUrl: 'https://api.telegram.org',
    maxRetries: 3,
    timeout: 30000
  },

  // Безопасность
  security: {
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
    sessionSecret: process.env.SESSION_SECRET || 'unifarm-secret-key',
    jwtSecret: process.env.JWT_SECRET || 'unifarm-jwt-secret'
  }
};

export default config;