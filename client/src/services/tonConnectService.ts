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

// Создаем экземпляр TonConnectUI
let tonConnectUI: TonConnectUI | null = null;

/**
 * Возвращает экземпляр TonConnectUI, созданный TonConnectUIProvider
 * 
 * ВАЖНО: Мы не создаем экземпляр здесь, а получаем доступ к тому, что создал TonConnectUIProvider
 */
export function getTonConnectUI(): TonConnectUI {
  // Получаем глобальный экземпляр TonConnectUI, созданный TonConnectUIProvider
  // @ts-ignore - window.__ton_connector__ существует, но TypeScript не знает об этом
  if (!tonConnectUI && window.__ton_connector__) {
    // @ts-ignore - window.__ton_connector__ создается TonConnectUIProvider
    tonConnectUI = window.__ton_connector__;
    console.log('TonConnect instance retrieved from TonConnectUIProvider');
  }
  
  if (tonConnectUI) {
    return tonConnectUI;
  }
  
  // Если почему-то экземпляр не доступен, возвращаем заглушку
  console.warn('TonConnect instance not available from TonConnectUIProvider');
  return {} as TonConnectUI;
}

/**
 * Проверяет, подключен ли в данный момент TON кошелек
 */
export function isTonWalletConnected(): boolean {
  const tonConnect = getTonConnectUI();
  return tonConnect.connected;
}

/**
 * Подключает TON кошелек, если он не подключен
 */
export async function connectTonWallet(): Promise<boolean> {
  const tonConnect = getTonConnectUI();
  
  try {
    if (!tonConnect.connected) {
      await tonConnect.connectWallet();
      return tonConnect.connected;
    }
    return true;
  } catch (error) {
    console.error('Error connecting TON wallet:', error);
    return false;
  }
}

/**
 * Отключает TON кошелек
 */
export async function disconnectTonWallet(): Promise<void> {
  const tonConnect = getTonConnectUI();
  
  if (tonConnect.connected) {
    await tonConnect.disconnect();
  }
}

/**
 * Получает адрес подключенного TON кошелька
 */
export function getTonWalletAddress(): string | null {
  const tonConnect = getTonConnectUI();
  
  if (tonConnect.connected && tonConnect.account) {
    return tonConnect.account.address;
  }
  
  return null;
}

/**
 * Отправляет TON транзакцию на указанный адрес с комментарием
 * @param amount Сумма TON (в базовых единицах, 1 TON = 10^9 nanoTON)
 * @param comment Комментарий к транзакции
 * @returns Результат транзакции или null в случае ошибки
 */
export async function sendTonTransaction(
  amount: string,
  comment: string
): Promise<{txHash: string; status: 'success' | 'error'} | null> {
  const tonConnect = getTonConnectUI();
  
  try {
    if (!tonConnect.connected) {
      await connectTonWallet();
      
      if (!tonConnect.connected) {
        throw new WalletNotConnectedError();
      }
    }
    
    // Рассчитываем время завершения транзакции (текущее время + TX_LIFETIME)
    const validUntil = Math.floor(Date.now() / 1000) + TX_LIFETIME;
    
    // Преобразуем TON в nanoTON
    const amountNano = amount + '000000000'; // 1 TON = 10^9 nanoTON
    
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
    
    const result = await tonConnect.sendTransaction(transaction);
    
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
 * Формирует ссылку на оплату TON для внешних кошельков
 * @param amount Сумма TON
 * @param comment Комментарий к транзакции (обычно содержит UniFarmBoost:userId:boostId)
 * @returns URL для открытия в TON кошельке
 */
export function generateTonPaymentLink(amount: string, comment: string): string {
  // Преобразуем TON в nanoTON
  const amountNano = parseFloat(amount) * 1000000000; // 1 TON = 10^9 nanoTON
  
  // Кодируем комментарий для URL
  const encodedComment = encodeURIComponent(comment);
  
  // Формируем ton:// ссылку для открытия в кошельке
  return `ton://transfer/${TON_PROJECT_ADDRESS}?amount=${amountNano}&text=${encodedComment}`;
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
export const getTonConnect = getTonConnectUI;

/**
 * Добавить слушателя соединения
 */
export function addConnectionListener(listener: ConnectionListener): void {
  connectionListeners.push(listener);
  // Сразу вызываем с текущим статусом
  const connected = isWalletConnected();
  listener(connected);
}

/**
 * Удалить слушателя соединения
 */
export function removeConnectionListener(listener: ConnectionListener): void {
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