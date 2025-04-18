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
 * Возвращает экземпляр TonConnectUI, если он еще не создан - создает новый
 */
export function getTonConnectUI(): TonConnectUI {
  if (!tonConnectUI) {
    tonConnectUI = new TonConnectUI({
      manifestUrl: 'https://unifarm-app.replit.app/tonconnect-manifest.json',
      buttonRootId: 'ton-connect-button',
      uiPreferences: {
        theme: THEME.DARK
      }
    });
    
    console.log('TonConnect initialized');
    
    // Проверяем статус соединения периодически
    setInterval(() => {
      if (tonConnectUI?.connected) {
        console.log('TonConnect connected to wallet:', tonConnectUI.wallet && 'name' in tonConnectUI.wallet 
          ? (tonConnectUI.wallet as any).name 
          : 'unknown');
      }
    }, 10000);
    
    console.log('TonConnect status check interval started');
  }
  
  return tonConnectUI;
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
 */
export function initTonConnect(): void {
  // Получаем экземпляр TonConnectUI
  const tonConnect = getTonConnectUI();
  
  // Добавляем слушатель для отслеживания изменений состояния подключения
  tonConnect.onStatusChange((walletInfo) => {
    const isConnected = !!walletInfo;
    
    // Уведомляем всех слушателей об изменении статуса
    connectionListeners.forEach(listener => {
      listener(isConnected);
    });
    
    // Логируем статус соединения
    if (isConnected) {
      const walletName = walletInfo && 'name' in walletInfo ? (walletInfo as any).name : 'Unknown wallet';
      console.log('TON wallet connected:', walletName);
    } else {
      console.log('TON wallet disconnected');
    }
  });
  
  console.log('TON Connect initialized');
}