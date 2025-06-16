/**
 * Auth Model - Supabase Integration
 * Константы и типы для системы авторизации
 */

// Supabase table constants
export const AUTH_TABLES = {
  USERS: 'users',
  USER_SESSIONS: 'user_sessions'
} as const;

// Authentication methods
export const AUTH_METHODS = {
  TELEGRAM_INIT_DATA: 'telegram_init_data',
  TELEGRAM_DIRECT: 'telegram_direct',
  JWT_TOKEN: 'jwt_token'
} as const;

// Authentication statuses
export const AUTH_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
  EXPIRED: 'expired',
  INVALID: 'invalid'
} as const;

// JWT configuration
export const JWT_CONFIG = {
  EXPIRES_IN: '7d',
  ALGORITHM: 'HS256',
  ISSUER: 'unifarm-app'
} as const;

// Session configuration
export const SESSION_CONFIG = {
  EXPIRES_HOURS: 168, // 7 days
  CLEANUP_INTERVAL_HOURS: 24,
  MAX_SESSIONS_PER_USER: 5
} as const;