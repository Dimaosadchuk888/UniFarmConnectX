/**
 * TON Boost Payment Configuration
 */

import { getTonBoostReceiverAddress } from './tonBoostPayment';

export const tonBoostConfig = {
  // Адрес кошелька для получения платежей за Boost пакеты
  // Используем централизованную конфигурацию из tonBoostPayment.ts
  WALLET_ADDRESS: getTonBoostReceiverAddress(),
  
  // Настройки транзакций
  TRANSACTION_TIMEOUT: 300, // 5 минут в секундах
  CONFIRMATION_TIMEOUT: 600, // 10 минут для подтверждения в блокчейне
  
  // Комментарии для транзакций
  TRANSACTION_COMMENT_PREFIX: 'UniFarm TON Boost Purchase',
  
  // Настройки проверки платежей
  VERIFICATION_ATTEMPTS: 3,
  VERIFICATION_DELAY: 30000, // 30 секунд между попытками
};

/**
 * Получает адрес кошелька для TON Boost платежей
 */
export function getTonBoostWalletAddress(): string {
  return tonBoostConfig.WALLET_ADDRESS;
}

/**
 * Проверяет корректность адреса TON кошелька
 */
export function isValidTonAddress(address: string): boolean {
  return /^(UQ|EQ|kQ)[A-Za-z0-9_-]{46}$/.test(address);
}