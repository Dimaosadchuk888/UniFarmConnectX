/**
 * Telegram Model - Supabase Integration
 * Константы и типы для Telegram операций
 */

// Supabase table constants
export const TELEGRAM_TABLES = {
  USERS: 'users',
  USER_SESSIONS: 'user_sessions'
} as const;

// Telegram update types
export const TELEGRAM_UPDATE_TYPES = {
  MESSAGE: 'message',
  CALLBACK_QUERY: 'callback_query',
  INLINE_QUERY: 'inline_query',
  WEB_APP_DATA: 'web_app_data'
} as const;

// Telegram authentication constants
export const TELEGRAM_AUTH = {
  TOKEN_EXPIRES_HOURS: 168, // 7 days
  INIT_DATA_TIMEOUT_SECONDS: 86400, // 24 hours
  HASH_ALGORITHM: 'sha256'
} as const;

// Telegram configuration
export const TELEGRAM_CONFIG = {
  BOT_USERNAME: '@UniFarming_Bot',
  WEBAPP_URL: process.env.TELEGRAM_WEBAPP_URL || '',
  WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || '',
  DEFAULT_LANGUAGE: 'ru'
} as const;

// Telegram validation rules
export const TELEGRAM_VALIDATION = {
  MIN_USER_ID: 1,
  MAX_USER_ID: 999999999999,
  USERNAME_MAX_LENGTH: 32,
  FIRST_NAME_MAX_LENGTH: 64
} as const;