/**
 * Конфигурация TonConnect для подключения к TON-кошелькам
 */

// Манифест для подключения TonConnect
export const TONCONNECT_MANIFEST_URL = 'https://uni-farm-connect-1-misterxuniverse.replit.app/tonconnect-manifest.json';

// Опции для TonConnect UI
export const tonConnectOptions = {
  manifestUrl: TONCONNECT_MANIFEST_URL,
  buttonRootId: 'ton-connect-button'
};