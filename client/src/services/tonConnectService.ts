/**
 * Сервис для работы с TonConnect - подключение к TON-кошелькам
 */
import { TonConnectUI, THEME } from '@tonconnect/ui';
import { TONCONNECT_MANIFEST_URL } from '@/config/tonConnect';

// Глобальная переменная для хранения экземпляра TonConnect
let tonConnectUI: TonConnectUI | null = null;

// Глобальная переменная для хранения обработчиков статуса подключения
type ConnectionListener = () => void;
const connectionListeners: ConnectionListener[] = [];

// Интервал проверки подключения
let connectionCheckInterval: NodeJS.Timeout | null = null;

/**
 * Инициализирует TonConnect
 */

export function initTonConnect() {
  try {
    if (!tonConnectUI) {
      // Создаем экземпляр TonConnect для подключения к кошелькам
      tonConnectUI = new TonConnectUI({
        manifestUrl: TONCONNECT_MANIFEST_URL,
        buttonRootId: 'ton-connect-root',
        uiPreferences: {
          theme: THEME.DARK
        }
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
    if (connector) {
      await connector.openModal();
    }
  } catch (error) {
    console.error('Error opening TonConnect modal:', error);
  }
}

/**
 * Отключает подключенный TON-кошелек и очищает хранилище
 */
export async function disconnectWallet() {
  const connector = getTonConnect();
  try {
    if (connector) {
      await connector.disconnect();
      
      // Очистка хранилища после отключения
      localStorage.removeItem('ton-connect-storage');
      sessionStorage.clear();
      console.log('TonConnect storage cleaned');
    }
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
  }
}

/**
 * Переподключает кошелёк: отключает текущий, очищает хранилище и инициализирует новое подключение
 */
export async function reconnectWallet() {
  try {
    // Сначала отключаем текущий кошелёк и очищаем хранилище
    await disconnectWallet();
    
    // Небольшая задержка для гарантии завершения предыдущих операций
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Используем существующее соединение без пересоздания экземпляра
    // Так как disconnectWallet уже очистил хранилище
    const connector = getTonConnect();
    
    if (connector) {
      // Открываем модальное окно для нового подключения
      await connector.openModal();
      console.log('Wallet reconnected successfully');
    }
  } catch (error) {
    console.error('Error reconnecting wallet:', error);
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

/**
 * Запускает интервал проверки подключения, если он еще не был запущен
 */
export function startConnectionCheck(): void {
  if (connectionCheckInterval) {
    return; // Интервал уже запущен
  }
  
  // Запускаем интервал для проверки подключения
  connectionCheckInterval = setInterval(() => {
    // Оповещаем всех слушателей об изменении статуса подключения
    notifyConnectionListeners();
  }, 2000);
  
  console.log('TonConnect status check interval started');
}

/**
 * Останавливает интервал проверки подключения
 */
export function stopConnectionCheck(): void {
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
    connectionCheckInterval = null;
    console.log('TonConnect status check interval stopped');
  }
}

/**
 * Добавляет слушателя изменения статуса подключения
 * @param listener Функция-обработчик, которая будет вызвана при изменении статуса подключения
 */
export function addConnectionListener(listener: ConnectionListener): void {
  connectionListeners.push(listener);
}

/**
 * Удаляет слушателя изменения статуса подключения
 * @param listener Функция-обработчик, которую нужно удалить
 */
export function removeConnectionListener(listener: ConnectionListener): void {
  const index = connectionListeners.indexOf(listener);
  if (index !== -1) {
    connectionListeners.splice(index, 1);
  }
}

/**
 * Оповещает всех слушателей об изменении статуса подключения
 */
function notifyConnectionListeners(): void {
  // Вызываем все зарегистрированные обработчики
  connectionListeners.forEach(listener => listener());
}

// Автоматически запускаем проверку подключения при импорте модуля
startConnectionCheck();