/**
 * Сервис для работы с TonConnect - подключение к TON-кошелькам
 */
import { TonConnectUI } from '@tonconnect/ui';
import { tonConnectOptions } from '@/config/tonConnect';

// Глобальная переменная для хранения экземпляра TonConnect
let tonConnectUI: TonConnectUI | null = null;

/**
 * Инициализирует TonConnect
 */
export function initTonConnect() {
  try {
    if (!tonConnectUI) {
      // Создаем экземпляр TonConnect для подключения к кошелькам
      tonConnectUI = new TonConnectUI({
        manifestUrl: 'https://uni-farm-connect-1-misterxuniverse.replit.app/tonconnect-manifest.json',
      });
      console.log('TonConnect initialized');
    }
    return tonConnectUI;
  } catch (error) {
    console.error('Error initializing TonConnect:', error);
    return null;
  }
}

/**
 * Получает экземпляр TonConnectUI для использования в компонентах
 * @returns Экземпляр TonConnectUI
 */
export function getTonConnect(): TonConnectUI {
  if (!tonConnectUI) {
    return initTonConnect() as TonConnectUI;
  }
  return tonConnectUI;
}

/**
 * Открывает модальное окно для подключения к TON-кошельку
 */
export async function connectWallet() {
  const connector = getTonConnect();
  try {
    await connector.openModal();
  } catch (error) {
    console.error('Error opening TonConnect modal:', error);
  }
}

/**
 * Отключает подключенный TON-кошелек
 */
export async function disconnectWallet() {
  const connector = getTonConnect();
  try {
    await connector.disconnect();
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
  }
}

/**
 * Проверяет, подключен ли TON-кошелек
 * @returns true, если кошелек подключен
 */
export function isWalletConnected(): boolean {
  const connector = getTonConnect();
  return connector ? connector.connected : false;
}

/**
 * Получает адрес подключенного TON-кошелька
 * @returns адрес кошелька или null, если кошелек не подключен
 */
export function getWalletAddress(): string | null {
  const connector = getTonConnect();
  
  if (!connector || !connector.connected || !connector.account) {
    return null;
  }
  
  // Возвращаем адрес в формате UQ...
  return connector.account.address;
}

/**
 * Возвращает сокращенную версию адреса кошелька
 * @param address полный адрес кошелька
 * @returns сокращенный адрес (например, UQBIRu...c8h)
 */
export function shortenAddress(address: string): string {
  if (!address) return '';
  
  // Длина начала и окончания адреса для отображения
  const startChars = 6;
  const endChars = 3;
  
  if (address.length <= startChars + endChars + 3) {
    return address; // Если адрес короткий, возвращаем его полностью
  }
  
  const start = address.substring(0, startChars);
  const end = address.substring(address.length - endChars);
  
  return `${start}...${end}`;
}