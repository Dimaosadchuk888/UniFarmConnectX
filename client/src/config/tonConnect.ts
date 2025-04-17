/**
 * Конфигурация TonConnect для подключения к TON-кошелькам
 */
import { TonConnectOptions } from '@tonconnect/ui';

// Манифест для подключения TonConnect
export const TONCONNECT_MANIFEST_URL = 'https://uni-farm-connect-1-misterxuniverse.replit.app/tonconnect-manifest.json';

// Опции для TonConnect UI
export const tonConnectOptions: TonConnectOptions = {
  manifestUrl: TONCONNECT_MANIFEST_URL,
  // Поддерживаемые Embedded Wallets (для WebApp в Telegram)
  embeddedWallets: [
    'telegram-wallet'
  ],
  // Расширение обработки для Telegram WebApp
  uiPreferences: {
    // Настройки, подходящие для mini-app
    theme: 'dark',
    colorsScheme: 'dark',
    borderRadius: 'medium',
  }
};