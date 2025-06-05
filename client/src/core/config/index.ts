/**
 * Core configuration for UniFarm client
 */

// WebSocket Configuration
export const WEBSOCKET_CONFIG = {
  ENABLED: false, // Отключаем WebSocket для устранения ошибок подключения
  RECONNECT_INTERVAL: 3000,
  MAX_RECONNECT_ATTEMPTS: 5,
  TIMEOUT: 10000
};

// API Configuration
export const API_CONFIG = {
  BASE_URL: typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : '',
  TIMEOUT: 15000,
  RETRIES: 2
};

// Environment detection
export const ENV = {
  isDevelopment: typeof window !== 'undefined' && window.location.hostname === 'localhost',
  isProduction: typeof window !== 'undefined' && window.location.hostname.includes('replit.app')
};