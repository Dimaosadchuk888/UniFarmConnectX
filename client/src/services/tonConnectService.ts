import { 
  TonConnectUI, 
  TonConnect, 
  isWalletInfoInjected, 
  UserRejectsError, 
  WalletNotConnectedError,
  THEME
} from '@tonconnect/ui-react';
import { CHAIN } from '@tonconnect/protocol';
// Динамический импорт @ton/core будет происходить только при необходимости

// Для отладки - логирование операций TonConnect
const DEBUG_ENABLED = false; // Отключаем debug логи в production
function debugLog(...args: any[]) {
  if (DEBUG_ENABLED) {
    console.log('[TON_CONNECT_DEBUG]', ...args);
  }
}

// Тип слушателя соединения
type ConnectionListener = (connected: boolean) => void;
// Хранение слушателей
const connectionListeners: ConnectionListener[] = [];

// Адрес TON кошелька проекта из переменной окружения (user-friendly формат)
export const TON_PROJECT_ADDRESS = 
  import.meta.env.VITE_TON_BOOST_RECEIVER_ADDRESS || 
  'UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8';

// Функция для конвертации адреса в raw формат если необходимо
export async function ensureRawAddress(address: string): Promise<string> {
  try {
    const { Address } = await import('@ton/core');
    const parsed = Address.parse(address);
    return parsed.toString({ urlSafe: false, bounceable: true, testOnly: false });
  } catch (error) {
    console.error('Ошибка конвертации адреса в raw формат:', error);
    return address;
  }
}

// Время жизни транзакции в секундах (30 минут)
const TX_LIFETIME = 30 * 60;

/**
 * Преобразует Uint8Array в base64 строку (безопасно для браузера, не использует Buffer)
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const binaryString = Array.from(bytes)
    .map(byte => String.fromCharCode(byte))
    .join('');
  return btoa(binaryString);
}

/**
 * Создаёт BOC-payload с комментарием (улучшенная версия)
 * @param comment Текст комментария
 * @returns base64-строка для payload
 */
async function createBocWithComment(comment: string): Promise<string> {
  try {
    // Добавляем полифилл Buffer для браузера (улучшенный)
    if (typeof window !== 'undefined' && !window.Buffer) {
      window.Buffer = {
        from: (data: any, encoding?: string) => {
          if (typeof data === 'string' && encoding === 'base64') {
            return Uint8Array.from(atob(data), c => c.charCodeAt(0));
          }
          if (typeof data === 'string') {
            return new TextEncoder().encode(data);
          }
          return new Uint8Array(data);
        },
        isBuffer: () => false
      } as any;
    }
    
    // Статический импорт @ton/core для избежания проблем с таймингом
    const { beginCell } = await import('@ton/core');
    
    // Валидация входного комментария
    if (!comment || typeof comment !== 'string') {
      console.warn('Пустой или невалидный комментарий, используем дефолтный');
      comment = 'UniFarm Deposit';
    }
    
    // Создаем правильный BOC для TON комментария
    const cell = beginCell()
      .storeUint(0, 32) // Опкод 0 для текстового комментария
      .storeStringTail(comment) // Сохраняем текст комментария
      .endCell();
    
    // Получаем BOC и конвертируем в base64
    const boc = cell.toBoc();
    const payload = uint8ArrayToBase64(boc);
    
    console.log(`✅ BOC-payload создан: длина ${payload.length} символов, комментарий "${comment}"`);
    return payload;
  } catch (error) {
    console.error('Критическая ошибка при создании BOC:', error);
    
    // Динамический fallback: создаем корректный BOC
    try {
      console.warn('⚠️ Используется динамический BOC fallback');
      const { beginCell } = await import('@ton/core');
      const fallbackCell = beginCell()
        .storeUint(0, 32)
        .storeStringTail("UniFarm")
        .endCell();
      const fallbackPayload = uint8ArrayToBase64(fallbackCell.toBoc());
      return fallbackPayload;
    } catch (e) {
      console.error('Динамический fallback также не удался:', e);
      return '';
    }
  }
}

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
 * Сохраняет адрес TON кошелька в backend
 * @param walletAddress Адрес кошелька
 */
export async function saveTonWalletAddress(walletAddress: string): Promise<boolean> {
  try {
    const response = await fetch('/api/v2/wallet/connect-ton', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('unifarm_jwt_token')}`
      },
      body: JSON.stringify({ walletAddress })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('[TON_CONNECT] Адрес кошелька сохранен:', walletAddress);
      return true;
    } else {
      console.error('[TON_CONNECT] Ошибка сохранения адреса:', data.error);
      return false;
    }
  } catch (error) {
    console.error('[TON_CONNECT] Ошибка при сохранении адреса кошелька:', error);
    return false;
  }
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
    
    // Проверяем, доступен ли метод openModal
    if (typeof tonConnectUI.openModal !== 'function') {
      console.error('Error: tonConnectUI.openModal is not a function');
      return false;
    }
    
    // Проверяем текущее состояние подключения
    debugLog('Current connection state:', { connected: tonConnectUI.connected });
    
    if (!tonConnectUI.connected) {
      debugLog('Attempting to connect wallet...');
      // Открываем модальное окно для подключения кошелька
      await tonConnectUI.openModal();
      
      // После подключения сохраняем адрес в user-friendly формате
      if (tonConnectUI.connected && tonConnectUI.wallet) {
        const address = await getTonWalletAddress(tonConnectUI, 'user-friendly');
        if (address) {
          await saveTonWalletAddress(address);
        }
      }
      
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
 * Получает адрес подключенного TON кошелька в user-friendly формате
 * @param tonConnectUI Экземпляр TonConnectUI из useTonConnectUI хука
 * @param format Формат адреса: 'raw' или 'user-friendly' (по умолчанию)
 */
export async function getTonWalletAddress(tonConnectUI: TonConnectUI, format: 'raw' | 'user-friendly' = 'user-friendly'): Promise<string | null> {
  if (tonConnectUI && tonConnectUI.connected && tonConnectUI.account) {
    const rawAddress = tonConnectUI.account.address;
    
    if (format === 'raw') {
      return rawAddress;
    }
    
    // Конвертируем raw адрес в user-friendly формат
    try {
      const { Address } = await import('@ton/core');
      const address = Address.parse(rawAddress);
      return address.toString({ 
        urlSafe: true, 
        bounceable: true, 
        testOnly: false 
      });
    } catch (error) {
      console.error('Ошибка конвертации адреса в user-friendly формат:', error);
      // Fallback на raw адрес если конвертация не удалась
      return rawAddress;
    }
  }
  
  return null;
}

/**
 * Эмулирует TON транзакцию перед отправкой
 * @param tonConnectUI Экземпляр TonConnectUI
 * @param transaction Объект транзакции для эмуляции
 * @returns Результат эмуляции
 */
async function emulateTonTransaction(tonConnectUI: TonConnectUI, transaction: any): Promise<boolean> {
  try {
    console.log('[EMULATION] Начинаем эмуляцию транзакции...');
    
    // Проверяем базовые параметры транзакции
    if (!transaction.messages || !Array.isArray(transaction.messages) || transaction.messages.length === 0) {
      console.error('[EMULATION] Ошибка: нет сообщений в транзакции');
      return false;
    }
    
    const message = transaction.messages[0];
    
    // Валидируем адрес получателя
    if (!message.address || typeof message.address !== 'string') {
      console.error('[EMULATION] Ошибка: некорректный адрес получателя');
      return false;
    }
    
    // Валидируем сумму
    if (!message.amount || isNaN(Number(message.amount))) {
      console.error('[EMULATION] Ошибка: некорректная сумма');
      return false;
    }
    
    // Проверяем payload
    if (message.payload && typeof message.payload !== 'string') {
      console.error('[EMULATION] Ошибка: некорректный payload');
      return false;
    }
    
    // Проверяем срок действия
    const currentTime = Math.floor(Date.now() / 1000);
    if (transaction.validUntil && transaction.validUntil <= currentTime) {
      console.error('[EMULATION] Ошибка: транзакция истекла');
      return false;
    }
    
    console.log('[EMULATION] ✅ Предварительная валидация прошла успешно');
    return true;
  } catch (error) {
    console.error('[EMULATION] Ошибка при эмуляции:', error);
    return false;
  }
}

/**
 * Отправляет TON транзакцию на указанный адрес с комментарием (улучшенная версия)
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
    // Извлекаем userId и boostId из комментария (примем что комментарий в формате UniFarmBoost:userId:boostId)
    const parts = comment.split(':');
    const userId = parts.length > 1 ? parts[1] : '1';
    const boostId = parts.length > 2 ? parts[2] : '1';
    
    // Отладка удалена согласно ТЗ для production
    
    // Проверяем только наличие tonConnectUI и состояние подключения
    if (!tonConnectUI) {
      console.error('[ERROR] tonConnectUI is null or undefined');
      throw new Error('TonConnectUI is not initialized');
    }
    
    // По ТЗ: проверяем только подключение
    if (!tonConnectUI.connected) {
      console.log('[INFO] Кошелек не подключен, пытаемся подключить...');
      await connectTonWallet(tonConnectUI);
      
      // Проверяем подключение снова
      if (!tonConnectUI.connected) {
        console.error('[ERROR] Не удалось подключить кошелек');
        throw new WalletNotConnectedError();
      }
    }
    
    // Преобразуем сумму из TON в наноTON (1 TON = 10^9 наноTON)
    // Сначала проверяем, что amount является строкой с десятичным числом
    const tonAmount = parseFloat(amount);
    if (isNaN(tonAmount)) {
      console.error('[ERROR] Невалидная сумма TON:', amount);
      throw new Error('Невалидная сумма TON');
    }
    
    // Конвертируем TON в наноTON, округляем до ближайшего целого
    const nanoTonAmount = Math.round(tonAmount * 1000000000).toString();
    
    // Короткий комментарий для предотвращения ошибок BOC сериализации
    const rawPayload = "UniFarm";
    
    // Создаем BOC-payload с комментарием
    const payload = await createBocWithComment(rawPayload);
    
    // Для дополнительной проверки - в консоли выводим длину payload
    console.log(`✅ BOC-payload длина: ${payload.length} символов`);
    
    console.log("✅ Создан стандартный BOC-payload в соответствии с ТЗ");
    
    console.log("✅ Создан стандартный BOC-payload с маркером 0 и текстовым сообщением");
    
    // По ТЗ: добавляем логирование payload
    console.log("📦 rawPayload:", rawPayload);
    console.log("📦 BOC payload (base64):", payload);
    
    // Создаем транзакцию в соответствии с ТЗ (улучшенная версия)
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 600, // 10 минут
      messages: [
        {
          address: TON_PROJECT_ADDRESS, // User-friendly адрес
          amount: nanoTonAmount, // Сумма в наноTON
          payload: payload, // BOC payload
          bounce: false // Для обычных кошельков - устраняет ошибки эмуляции
        }
      ]
    };
    
    console.log("[DEBUG] Подготовленная транзакция:", {
      address: transaction.messages[0].address,
      amount: transaction.messages[0].amount,
      payloadLength: payload.length,
      validUntil: transaction.validUntil,
      comment: rawPayload
    });
    
    try {
      // Проверяем подключение кошелька
      if (!tonConnectUI.connected) {
        console.log('[INFO] Кошелек не подключен, пытаемся подключить...');
        await connectTonWallet(tonConnectUI);
        
        if (!tonConnectUI.connected) {
          console.error('[ERROR] Не удалось подключить кошелек');
          throw new WalletNotConnectedError('Не удалось подключить кошелёк');
        }
      }
      
      // НОВОЕ: Эмулируем транзакцию перед отправкой
      console.log("[TON] Выполняем предварительную эмуляцию транзакции...");
      const emulationResult = await emulateTonTransaction(tonConnectUI, transaction);
      
      if (!emulationResult) {
        console.error('[ERROR] Эмуляция транзакции не прошла');
        throw new Error('Транзакция не прошла предварительную валидацию');
      }
      
      console.log("[TON] ✅ Эмуляция успешна, отправляем транзакцию...");
      const result = await tonConnectUI.sendTransaction(transaction);
      debugLog('*** РЕЗУЛЬТАТ sendTransaction ***', result);
      
      // По ТЗ: добавляем лог результата транзакции
      console.log("✅ Transaction result:", result);
      
      // Вызов успешно выполнен - пользователь подтвердил транзакцию в Tonkeeper
      debugLog('Транзакция успешно отправлена, результат:', {
        boc: result.boc ? `есть (${result.boc.length} символов)` : 'нет',
        has_result: !!result
      });
      


      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Уведомляем backend о успешном TON депозите
      // Это предотвращает исчезновение депозитов из-за разрыва Frontend-Backend интеграции
      try {
        const { correctApiRequest } = await import('../../lib/correctApiRequest');
        
        console.log('[TON_DEPOSIT_FIX] Отправка депозита на backend...', {
          txHash: result.boc,
          amount: tonAmount,
          walletAddress: tonConnectUI.account?.address || 'unknown'
        });
        
        const backendResponse = await correctApiRequest('/api/v2/wallet/ton-deposit', 'POST', {
          ton_tx_hash: result.boc,
          amount: tonAmount,
          wallet_address: tonConnectUI.account?.address || 'unknown'
        });
        
        console.log('✅ Backend депозит успешно обработан:', backendResponse);
      } catch (backendError) {
        // КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ: Записываем все неудачные попытки депозита
        console.error('❌ [CRITICAL] TON депозит НЕ ОБРАБОТАН backend:', {
          txHash: result.boc,
          amount: tonAmount,
          error: backendError,
          timestamp: new Date().toISOString()
        });
        
        // НЕ выбрасываем ошибку - blockchain транзакция уже прошла успешно
        // Пользователь может обратиться в поддержку с этим hash для ручной обработки
      }

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
    console.log('[DEBUG] isTonPaymentReady вернул FALSE. Причины:', reasons.join(', '));
  } else {
    debugLog('isTonPaymentReady вернул TRUE. Все проверки пройдены.');
    console.log('[DEBUG] isTonPaymentReady вернул TRUE. Все проверки пройдены.');
  }
  
  // Возвращаем реальный результат проверки готовности
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
export const getWalletAddress = (tonConnectUI: TonConnectUI) => getTonWalletAddress(tonConnectUI, 'user-friendly');
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