/**
 * Базовая конфигурация приложения
 */

// Определяем базовый URL API
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
} as const;

export const TELEGRAM_CONFIG = {
  BOT_USERNAME: 'UniFarmBot',
  WEBAPP_URL: getBaseUrl(),
} as const;

// Настройки WebSocket подключений
export const WEBSOCKET_CONFIG = {
  ENABLED: true,
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_INTERVAL: 3000,
  EXTERNAL_URL: 'wss://uni-farm-connect-xo-osadchukdmitro2.replit.app/ws',
} as const;

export const TONCONNECT_MANIFEST_URL = '/tonconnect-manifest.json';

export const tonConnectOptions = {
  manifestUrl: TONCONNECT_MANIFEST_URL,
};