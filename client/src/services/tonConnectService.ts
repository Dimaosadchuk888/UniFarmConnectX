import { 
  TonConnectUI, 
  TonConnect, 
  isWalletInfoInjected, 
  UserRejectsError, 
  WalletNotConnectedError,
  THEME
} from '@tonconnect/ui-react';
import { CHAIN } from '@tonconnect/protocol';

// Для отладки
const DEBUG_ENABLED = true;
function debugLog(...args: any[]) {
  if (DEBUG_ENABLED) {
    console.log('[TON_CONNECT_DEBUG]', ...args);
  }
}

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
    debugLog('connectTonWallet called with', { tonConnectUI: !!tonConnectUI });
    
    if (!tonConnectUI) {
      console.error('Error: tonConnectUI is undefined in connectTonWallet');
      return false;
    }
    
    // Проверяем, доступен ли метод connectWallet
    if (typeof tonConnectUI.connectWallet !== 'function') {
      console.error('Error: tonConnectUI.connectWallet is not a function');
      return false;
    }
    
    // Проверяем текущее состояние подключения
    debugLog('Current connection state:', { connected: tonConnectUI.connected });
    
    if (!tonConnectUI.connected) {
      debugLog('Attempting to connect wallet...');
      // Вызываем соединение с кошельком
      await tonConnectUI.connectWallet();
      
      // Проверяем состояние после попытки подключения
      debugLog('Connection result:', { connected: tonConnectUI.connected, wallet: tonConnectUI.wallet });
      
      return tonConnectUI.connected;
    }
    
    debugLog('Wallet already connected');
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
    debugLog('sendTonTransaction - начало', {
      tonConnectUI: !!tonConnectUI,
      connected: tonConnectUI?.connected,
      available: !!tonConnectUI,
      walletInfo: tonConnectUI?.wallet ? 'present' : 'missing',
      sendTransactionFn: typeof tonConnectUI?.sendTransaction === 'function' ? 'available' : 'missing'
    });
    
    if (!tonConnectUI) {
      console.error('[ERROR] tonConnectUI is null or undefined');
      throw new Error('TonConnectUI is not initialized');
    }
    
    // Проверяем, доступна ли функция sendTransaction
    if (typeof tonConnectUI.sendTransaction !== 'function') {
      console.error('[ERROR] tonConnectUI.sendTransaction is not a function');
      throw new Error('sendTransaction method is not available on tonConnectUI');
    }
    
    if (!tonConnectUI.connected) {
      debugLog('Кошелек не подключен, пытаемся подключить...');
      const connected = await connectTonWallet(tonConnectUI);
      
      if (!connected || !tonConnectUI.connected) {
        console.error('[ERROR] Failed to connect wallet');
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
      comment: comment,
      address: TON_PROJECT_ADDRESS
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
    
    console.log('[DEBUG] Sending transaction with params:', JSON.stringify(transaction));
    
    try {
      debugLog('Начинаем отправку транзакции через TonConnect');
      
      // Дополнительная проверка на соединение
      if (!tonConnectUI.connected) {
        debugLog('Кошелек не подключен перед отправкой транзакции, пытаемся подключить...');
        
        // Запрашиваем соединение с кошельком
        const connectResult = await connectTonWallet(tonConnectUI);
        debugLog('Результат подключения перед транзакцией:', { connectResult });
        
        if (!connectResult || !tonConnectUI.connected) {
          debugLog('Не удалось подключить кошелек');
          throw new WalletNotConnectedError('Не удалось подключить кошелёк перед транзакцией');
        }
      }
      
      // Проверяем готовность sendTransaction непосредственно перед вызовом
      if (typeof tonConnectUI.sendTransaction !== 'function') {
        debugLog('КРИТИЧЕСКАЯ ОШИБКА: sendTransaction не является функцией');
        throw new Error('tonConnectUI.sendTransaction is not a function');
      }
      
      debugLog('Текущее состояние перед вызовом sendTransaction:', {
        connected: tonConnectUI.connected,
        wallet: tonConnectUI.wallet ? 'present' : 'missing',
        account: tonConnectUI.account ? tonConnectUI.account.address : 'no account',
        chainId: tonConnectUI.account?.chain
      });
      
      // ЭТО САМАЯ ГЛАВНАЯ ЧАСТЬ - непосредственный вызов sendTransaction
      // Этот вызов должен открыть кошелек Tonkeeper и ждать подтверждения от пользователя
      debugLog('Вызываем tonConnectUI.sendTransaction с транзакцией:', transaction);
      
      // Обратите внимание - нельзя добавлять никакой код между этими двумя блоками,
      // так как они должны выполняться синхронно для открытия Tonkeeper
      debugLog('*** ВЫЗОВ sendTransaction ***');
      const result = await tonConnectUI.sendTransaction(transaction);
      debugLog('*** РЕЗУЛЬТАТ sendTransaction ***', result);
      
      // Вызов успешно выполнен - пользователь подтвердил транзакцию в Tonkeeper
      debugLog('Транзакция успешно отправлена, результат:', {
        boc: result.boc ? `есть (${result.boc.length} символов)` : 'нет',
        has_result: !!result
      });
      
      return {
        txHash: result.boc,
        status: 'success'
      };
    } catch (error) {
      const txError = error as Error; // Типизируем ошибку как Error для доступа к свойствам
      
      debugLog('ОШИБКА при вызове sendTransaction:', { 
        errorType: typeof error,
        errorName: txError.name,
        errorMessage: txError.message,
        errorStack: txError.stack?.substring(0, 100) // Показываем только начало стека
      });
      
      // Классифицируем ошибку для более детального логирования
      if (error instanceof UserRejectsError) {
        debugLog('Пользователь отклонил транзакцию в кошельке');
      }
      else if (error instanceof WalletNotConnectedError) {
        debugLog('Ошибка: кошелек не подключен');
      }
      else {
        debugLog('Неизвестная ошибка при отправке транзакции', {
          errorToString: String(error),
          errorJSON: JSON.stringify(error)
        });
      }
      
      throw error;  // Re-throw to be caught by the outer try-catch
    }
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
  // Подробное логирование для отладки
  const hasConnectUI = !!tonConnectUI;
  const hasSendTransaction = hasConnectUI && typeof tonConnectUI.sendTransaction === 'function';
  const isConnected = hasConnectUI && !!tonConnectUI.connected;
  const hasWallet = hasConnectUI && !!tonConnectUI.wallet;
  const hasAccount = hasConnectUI && !!tonConnectUI.account;
  const hasAddress = hasAccount && !!tonConnectUI.account?.address;
  
  // Подробный отладочный лог с безопасной проверкой свойств
  debugLog('isTonPaymentReady состояние:', {
    hasConnectUI,
    hasSendTransaction,
    isConnected,
    hasWallet,
    hasAccount,
    hasAddress,
    wallet: hasWallet ? {
      // Безопасно получаем информацию о кошельке
      deviceAppName: tonConnectUI.wallet?.device?.appName,
      // Проверяем свойства, которые могут отсутствовать у некоторых типов Wallet
      walletInfo: {
        hasWalletObject: !!tonConnectUI.wallet,
        type: typeof tonConnectUI.wallet,
        appName: tonConnectUI.wallet?.device?.appName || 'unknown', 
      }
    } : null,
    account: hasAccount ? {
      chain: tonConnectUI.account?.chain,
      hasAddress: !!tonConnectUI.account?.address,
      address: tonConnectUI.account?.address 
        ? (tonConnectUI.account.address.slice(0, 10) + '...' + tonConnectUI.account.address.slice(-10))
        : 'no-address',
    } : null
  });
  
  // Более строгая проверка - требуем наличие подключенного кошелька и аккаунта
  const isReady = hasConnectUI && hasSendTransaction && isConnected && hasWallet && hasAccount && hasAddress;
  
  // Если не готов, логируем причину
  if (!isReady) {
    const reasons = [];
    if (!hasConnectUI) reasons.push('tonConnectUI отсутствует');
    if (!hasSendTransaction) reasons.push('sendTransaction не является функцией');
    if (!isConnected) reasons.push('кошелек не подключен (tonConnectUI.connected = false)');
    if (!hasWallet) reasons.push('информация о кошельке отсутствует (tonConnectUI.wallet = null)');
    if (!hasAccount) reasons.push('информация об аккаунте отсутствует (tonConnectUI.account = null)');
    if (!hasAddress) reasons.push('адрес кошелька отсутствует (tonConnectUI.account.address = null)');
    
    debugLog('isTonPaymentReady вернул FALSE. Причины:', reasons);
  } else {
    debugLog('isTonPaymentReady вернул TRUE. Все проверки пройдены.');
  }
  
  // Возвращаем результат проверки
  return isReady;
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