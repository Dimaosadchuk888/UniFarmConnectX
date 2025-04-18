import { 
  TonConnectUI, 
  TonConnect, 
  isWalletInfoInjected, 
  UserRejectsError, 
  WalletNotConnectedError,
  THEME
} from '@tonconnect/ui-react';
import { CHAIN } from '@tonconnect/protocol';

// Тип слушателя соединения
type ConnectionListener = (connected: boolean) => void;
// Хранение слушателей
const connectionListeners: ConnectionListener[] = [];

// Адрес TON кошелька проекта
export const TON_PROJECT_ADDRESS = 'UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8';

// Время жизни транзакции в секундах (30 минут)
const TX_LIFETIME = 30 * 60;

/**
 * Проверяет, подключен ли в данный момент TON кошелек
 * @param tonConnectUI Экземпляр TonConnectUI из useTonConnectUI хука
 */
export function isTonWalletConnected(tonConnectUI: TonConnectUI): boolean {
  if (!tonConnectUI) {
    console.error('TonConnectUI is not provided to isTonWalletConnected');
    return false;
  }
  return tonConnectUI.connected;
}

/**
 * Подключает TON кошелек, если он не подключен
 * @param tonConnectUI Экземпляр TonConnectUI из useTonConnectUI хука
 */
export async function connectTonWallet(tonConnectUI: TonConnectUI): Promise<boolean> {
  try {
    if (!tonConnectUI.connected) {
      await tonConnectUI.connectWallet();
      return tonConnectUI.connected;
    }
    return true;
  } catch (error) {
    console.error('Error connecting TON wallet:', error);
    return false;
  }
}

/**
 * Отключает TON кошелек
 * @param tonConnectUI Экземпляр TonConnectUI из useTonConnectUI хука
 */
export async function disconnectTonWallet(tonConnectUI: TonConnectUI): Promise<void> {
  if (tonConnectUI && tonConnectUI.connected) {
    await tonConnectUI.disconnect();
  }
}

/**
 * Получает адрес подключенного TON кошелька
 * @param tonConnectUI Экземпляр TonConnectUI из useTonConnectUI хука
 */
export function getTonWalletAddress(tonConnectUI: TonConnectUI): string | null {
  if (tonConnectUI && tonConnectUI.connected && tonConnectUI.account) {
    return tonConnectUI.account.address;
  }
  
  return null;
}

/**
 * Отправляет TON транзакцию на указанный адрес с комментарием
 * @param tonConnectUI Экземпляр TonConnectUI из useTonConnectUI хука
 * @param amount Сумма TON (в базовых единицах, 1 TON = 10^9 nanoTON)
 * @param comment Комментарий к транзакции
 * @returns Результат транзакции или null в случае ошибки
 */
export async function sendTonTransaction(
  tonConnectUI: TonConnectUI,
  amount: string,
  comment: string
): Promise<{txHash: string; status: 'success' | 'error'} | null> {
  try {
    if (!tonConnectUI.connected) {
      await connectTonWallet(tonConnectUI);
      
      if (!tonConnectUI.connected) {
        throw new WalletNotConnectedError();
      }
    }
    
    // Рассчитываем время завершения транзакции (текущее время + TX_LIFETIME)
    const validUntil = Math.floor(Date.now() / 1000) + TX_LIFETIME;
    
    // Правильное преобразование TON в nanoTON
    // Сначала превращаем строку в число, умножаем на 10^9 и затем обратно в строку
    const amountNumber = parseFloat(amount);
    const amountNano = Math.floor(amountNumber * 1_000_000_000).toString();
    
    console.log('[DEBUG] TonConnect transaction:', {
      amount: amount,
      amountNumber: amountNumber,
      amountNano: amountNano,
      comment: comment
    });
    
    const transaction = {
      validUntil,
      network: CHAIN.MAINNET,
      messages: [
        {
          address: TON_PROJECT_ADDRESS,
          amount: amountNano,
          payload: comment
        }
      ]
    };
    
    const result = await tonConnectUI.sendTransaction(transaction);
    
    return {
      txHash: result.boc,
      status: 'success'
    };
  } catch (error) {
    console.error('Error sending TON transaction:', error);
    
    if (error instanceof UserRejectsError) {
      return {
        txHash: '',
        status: 'error'
      };
    }
    
    return null;
  }
}

/**
 * Проверка, все ли готово для отправки TON транзакции
 * @param tonConnectUI Экземпляр TonConnectUI из useTonConnectUI хука
 * @returns true если TonConnect готов к использованию
 */
export function isTonPaymentReady(tonConnectUI: TonConnectUI): boolean {
  // Проверяем, инициализирован ли TonConnect и подключен ли кошелек
  return (
    tonConnectUI && 
    typeof tonConnectUI.sendTransaction === 'function' && 
    tonConnectUI.connected
  );
}

/**
 * Создает строку комментария для TON транзакции в формате UniFarmBoost:userId:boostId
 */
export function createTonTransactionComment(userId: number, boostId: number): string {
  return `UniFarmBoost:${userId}:${boostId}`;
}

/**
 * Для совместимости со старым кодом
 */
export const isWalletConnected = isTonWalletConnected;
export const getWalletAddress = getTonWalletAddress;
export const connectWallet = connectTonWallet;
export const disconnectWallet = disconnectTonWallet;

/**
 * Добавить слушателя соединения
 * @param tonConnectUI Экземпляр TonConnectUI из useTonConnectUI хука
 * @param listener Функция, которая будет вызвана при изменении статуса подключения
 */
export function addConnectionListener(tonConnectUI: TonConnectUI, listener: ConnectionListener): void {
  if (!listener) {
    console.error('Listener function is required for addConnectionListener');
    return;
  }
  
  connectionListeners.push(listener);
  
  // Сразу вызываем с текущим статусом
  if (tonConnectUI) {
    const connected = isWalletConnected(tonConnectUI);
    listener(connected);
  }
}

/**
 * Удалить слушателя соединения
 * @param listener Функция, которая была передана в addConnectionListener
 */
export function removeConnectionListener(listener: ConnectionListener): void {
  if (!listener) {
    console.error('Listener function is required for removeConnectionListener');
    return;
  }
  
  const index = connectionListeners.indexOf(listener);
  if (index !== -1) {
    connectionListeners.splice(index, 1);
  }
}

/**
 * Инициализация TON Connect при запуске приложения
 * 
 * ВАЖНО: 
 * Эта функция отключена, поскольку используется TonConnectUIProvider из @tonconnect/ui-react
 * TonConnectUIProvider сам инициализирует TON Connect 
 */
export function initTonConnect(): void {
  // Эта функция теперь просто логирует сообщение и не выполняет реальной инициализации
  console.log('TON Connect initialized by TonConnectUIProvider in App.tsx');
}

/**
 * Этот экспорт существует для обратной совместимости,
 * но фактически он будет заменен прямым импортом из useTonConnectUI
 */
export const getTonConnectUI = () => {
  console.warn('getTonConnectUI is deprecated, use useTonConnectUI hook instead');
  return null as unknown as TonConnectUI;
}