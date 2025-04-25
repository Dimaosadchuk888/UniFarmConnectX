/**
 * Сервис для работы с Telegram WebApp
 * Обеспечивает стабильное взаимодействие с Telegram API в Mini App
 */

// Расширение типов для Telegram WebApp API
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        expand: () => void;
        ready: () => void;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            username?: string;
            first_name?: string;
            last_name?: string;
            photo_url?: string;
          };
          auth_date?: string;
          hash?: string;
          platform?: string;
        };
        platform?: string;
        colorScheme?: string;
        startParam?: string; // Параметр start= из ссылки запуска бота
        version?: string;    // Версия API
        themeParams?: Record<string, string>; // Параметры темы
        
        // Методы из полного API
        MainButton?: {
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
          onClick: (callback: Function) => void;
        };
        sendData?: (data: string) => void;
        openLink?: (url: string) => void;
      };
    };
    // Добавляем поддержку фиксации Telegram ID в localStorage
    localStorage?: Storage;
  }
}

// Ключ для хранения ID пользователя в localStorage
const TELEGRAM_USER_ID_KEY = 'telegram_user_id';
// Ключ для хранения времени последнего сохранения telegram_id
const TELEGRAM_ID_TIMESTAMP_KEY = 'telegram_id_timestamp';
// Ключ для хранения данных initData
const TELEGRAM_INIT_DATA_KEY = 'telegramInitData';
// Ключ для хранения данных пользователя Telegram
const TELEGRAM_USER_DATA_KEY = 'telegram_user_data';
// Ключ для режима отладки
const TELEGRAM_DEBUG_MODE_KEY = 'telegram_debug_mode';
// Ключ для хранения статуса регистрации пользователя
const TELEGRAM_REGISTERED_KEY = 'telegram_user_registered';

/**
 * Проверяет, запущено ли приложение в Telegram WebApp и доступны ли все необходимые свойства API
 * @returns {boolean} true если Telegram WebApp API доступен и содержит необходимые данные
 */
/**
 * Проверяет, запущено ли приложение в реальной среде Telegram Mini App
 * Включает строгую проверку согласно новым требованиям безопасности
 * 
 * @returns {boolean} true только если приложение точно запущено в Telegram Mini App
 */
export function isRunningInTelegram(): boolean {
  console.log('[TG INIT] Checking if running in Telegram...');
  
  // 1. Проверяем наличие объекта Telegram и WebApp
  const hasTelegramObject = !!window.Telegram;
  const hasWebAppObject = !!window.Telegram?.WebApp;
  
  // Для логирования
  let reason = '';
  let hasValidInitData = false;
  let initDataLength = 0;
  
  // 2. Проверяем наличие и длину initData
  if (hasWebAppObject && window.Telegram && window.Telegram.WebApp && 
      typeof window.Telegram.WebApp.initData === 'string') {
    initDataLength = window.Telegram.WebApp.initData.length;
    hasValidInitData = initDataLength > 10; // Требуем минимальную длину 10 символов
  }
  
  // 3. Проверяем запуск в iframe (как обычно запускаются Mini Apps)
  const isInIframe = window !== window.parent;
  
  // 4. Проверяем User-Agent на признаки Telegram
  const userAgent = navigator.userAgent.toLowerCase();
  const isTelegramUA = userAgent.includes('telegram') || 
                       userAgent.includes('tgweb');
  
  // 5. Проверяем referrer на наличие telegram
  const hasTelegramReferrer = document.referrer.toLowerCase().includes('telegram');
  
  // Все проверки должны соответствовать запуску в Telegram Mini App
  // (кроме режима разработки)
  
  // В режиме разработки разрешаем эмуляцию через URL параметр для отладки
  if (process.env.NODE_ENV === 'development') {
    // Специальный параметр URL для эмуляции Telegram в режиме разработки
    const urlParams = new URLSearchParams(window.location.search);
    const emulateTelegram = urlParams.get('telegram_mode') === 'true';
    
    // Для тестирования: если передан параметр, эмулируем Telegram
    if (emulateTelegram) {
      console.log('[TG INIT] ⚠️ Telegram environment emulated via URL param (dev mode)');
      return true;
    }
    
    // Если включена специальная отладка в localStorage
    try {
      const debugMode = localStorage.getItem('telegram_debug_mode') === 'true';
      if (debugMode) {
        console.log('[TG INIT] ⚠️ Telegram debug mode active via localStorage (dev mode)');
        return true;
      }
    } catch (e) {
      // Игнорируем ошибки доступа к localStorage
    }
  }
  
  // СТРОГАЯ ПРОВЕРКА: все необходимые условия
  const isFullTelegramEnvironment = hasTelegramObject && 
                                   hasWebAppObject && 
                                   hasValidInitData &&
                                   (isInIframe || isTelegramUA || hasTelegramReferrer);
  
  // Определяем причину отказа для логов
  if (!hasTelegramObject) {
    reason = 'window.Telegram объект отсутствует';
  } else if (!hasWebAppObject) {
    reason = 'window.Telegram.WebApp объект отсутствует';
  } else if (!hasValidInitData) {
    reason = `initData отсутствует или слишком короткий (длина: ${initDataLength})`;
  } else if (!(isInIframe || isTelegramUA || hasTelegramReferrer)) {
    reason = 'Окружение не похоже на Telegram (не iframe, нет Telegram в User-Agent или referrer)';
  }
  
  // Полное логирование всех проверок для отладки
  console.log('[TG INIT] Telegram environment check:', {
    hasTelegramObject,
    hasWebAppObject,
    initDataLength,
    hasValidInitData,
    isInIframe,
    isTelegramUA,
    hasTelegramReferrer,
    result: isFullTelegramEnvironment,
    reason: isFullTelegramEnvironment ? 'OK' : reason,
    userAgent,
    referrer: document.referrer || 'none'
  });
  
  console.log(`[TG CHECK] Telegram доступен: ${isFullTelegramEnvironment}`);
  
  if (!isFullTelegramEnvironment) {
    console.log(`[TG CHECK] Инициализация Telegram WebApp невозможна: ${reason}`);
  }
  
  return isFullTelegramEnvironment;
}

/**
 * Очищает все данные Telegram из localStorage, включая кэшированные initData и ID
 * Это критически важно при смене бота или обнаружении проблем с инициализацией
 * @returns {boolean} true если очистка прошла успешно
 */
export function clearTelegramCache(): boolean {
  console.log('[telegramService] 🧹 Clearing all Telegram cached data...');
  
  try {
    // Очищаем все ключи, связанные с Telegram
    localStorage.removeItem(TELEGRAM_INIT_DATA_KEY);
    localStorage.removeItem(TELEGRAM_USER_DATA_KEY);
    localStorage.removeItem(TELEGRAM_USER_ID_KEY);
    localStorage.removeItem(TELEGRAM_ID_TIMESTAMP_KEY);
    localStorage.removeItem(TELEGRAM_DEBUG_MODE_KEY);
    
    // Дополнительно ищем и удаляем любые ключи, содержащие ключевые слова
    const keysToCheck = ['telegram', 'tg_', 'webApp', 'initData', 'botId'];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const keyLower = key.toLowerCase();
        // Если ключ содержит любое из ключевых слов - удаляем
        if (keysToCheck.some(keyword => keyLower.includes(keyword))) {
          localStorage.removeItem(key);
          console.log(`[telegramService] Removed additional key: ${key}`);
        }
      }
    }
    
    console.log('[telegramService] ✅ All Telegram cache cleared successfully');
    return true;
  } catch (error) {
    console.error('[telegramService] ❌ Failed to clear Telegram cache:', error);
    return false;
  }
}

export function isTelegramWebApp(): boolean {
  // АУДИТ: Расширенное логирование для проверки инициализации Telegram WebApp
  // Выводим полное состояние Telegram объекта, включая initData и startParam
  console.log("[АУДИТ] [DIAG] Telegram WebApp State:", {
    isTelegramAvailable: !!window.Telegram,
    isWebAppAvailable: !!window.Telegram?.WebApp,
    initData: window.Telegram?.WebApp?.initData,
    initDataLength: window.Telegram?.WebApp?.initData?.length || 0,
    hasInitDataUnsafe: !!window.Telegram?.WebApp?.initDataUnsafe,
    hasUser: !!window.Telegram?.WebApp?.initDataUnsafe?.user,
    userId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'not available',
    username: window.Telegram?.WebApp?.initDataUnsafe?.user?.username || 'not available',
    firstName: window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || 'not available',
    startParam: window.Telegram?.WebApp?.startParam || 'not available',
    authDate: window.Telegram?.WebApp?.initDataUnsafe?.auth_date || 'not available',
    platform: window.Telegram?.WebApp?.platform || 'not available',
    version: window.Telegram?.WebApp?.version || 'not available',
    hash: window.Telegram?.WebApp?.initDataUnsafe?.hash ? 'present' : 'absent',
    fullInitData: window.Telegram?.WebApp?.initData || 'empty',
    documentURL: typeof document !== 'undefined' ? document.URL : 'not available',
    isIframe: typeof window !== 'undefined' ? window !== window.parent : false,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'not available',
    time: new Date().toISOString()
  });

  // Шаг 1: Проверка доступности window
  if (typeof window === 'undefined') {
    console.error('[telegramService] isTelegramWebApp check: window object not available');
    return false;
  }
  
  // Шаг 2: Проверка доступности объекта Telegram
  if (!window.Telegram) {
    console.error('[telegramService] isTelegramWebApp check: Telegram object not available');
    return false;
  }
  
  // Шаг 3: Проверка доступности объекта WebApp
  if (!window.Telegram.WebApp) {
    console.error('[telegramService] isTelegramWebApp check: WebApp object not available');
    return false;
  }
  
  // Шаг 4: Проверка доступности initData и его непустоты
  const hasValidInitData = typeof window.Telegram.WebApp.initData === 'string' && 
                         window.Telegram.WebApp.initData.trim() !== '';
  
  if (!hasValidInitData) {
    console.error('[telegramService] isTelegramWebApp check: initData is missing or empty');
    console.log('[telegramService] initData value:', window.Telegram.WebApp.initData);
  }
  
  // Шаг 5: Проверка наличия объекта initDataUnsafe
  const hasInitDataUnsafe = !!window.Telegram.WebApp.initDataUnsafe;
  
  if (!hasInitDataUnsafe) {
    console.error('[telegramService] isTelegramWebApp check: initDataUnsafe is missing');
  } else {
    console.log('[telegramService] initDataUnsafe content:', JSON.stringify(window.Telegram.WebApp.initDataUnsafe));
  }
  
  // Шаг 6: Проверка наличия объекта user в initDataUnsafe
  const hasUser = !!window.Telegram.WebApp.initDataUnsafe?.user;
  
  if (!hasUser && hasInitDataUnsafe) {
    console.error('[telegramService] isTelegramWebApp check: user object is missing in initDataUnsafe');
  } else if (hasUser) {
    console.log('[telegramService] user object found:', JSON.stringify(window.Telegram.WebApp.initDataUnsafe.user));
  }
  
  // Шаг 7: Проверка наличия id пользователя
  const hasUserId = typeof window.Telegram.WebApp.initDataUnsafe?.user?.id === 'number';
  
  if (!hasUserId && hasUser) {
    console.error('[telegramService] isTelegramWebApp check: user.id is missing or not a number');
  } else if (hasUserId) {
    console.log('[telegramService] user.id found:', window.Telegram.WebApp.initDataUnsafe?.user?.id);
  }
  
  // Проверка наличия startParam для реферальной программы
  if (window.Telegram.WebApp.startParam) {
    console.log('[telegramService] startParam detected:', window.Telegram.WebApp.startParam);
  } else {
    console.warn('[telegramService] No startParam available in Telegram WebApp');
  }
  
  // Финальный результат - нормальная работа требует наличия как initData, так и initDataUnsafe
  const hasTelegram = hasValidInitData && hasInitDataUnsafe;
  
  // Расширенное логирование для отладки с полной телеметрией
  console.log('[telegramService] isTelegramWebApp debug info:', {
    windowDefined: typeof window !== 'undefined',
    hasTelegramObject: !!window.Telegram,
    hasWebAppObject: !!window.Telegram.WebApp,
    hasInitData: typeof window.Telegram.WebApp.initData === 'string',
    initDataLength: (window.Telegram.WebApp.initData || '').length,
    initDataPreview: hasValidInitData ? 
                     `${window.Telegram.WebApp.initData.substring(0, 20)}...` : 
                     'empty or missing',
    hasInitDataUnsafe: hasInitDataUnsafe,
    hasUser: hasUser,
    hasUserId: hasUserId,
    userId: hasUserId && window.Telegram.WebApp.initDataUnsafe?.user ? window.Telegram.WebApp.initDataUnsafe.user.id : 'N/A',
    // @ts-ignore - Поля могут быть недоступны в типе, но доступны в реальном API
    startParam: window.Telegram?.WebApp?.startParam || 'not available',
    // @ts-ignore
    appVersion: window.Telegram?.WebApp?.version || 'not available',
    platform: window.Telegram?.WebApp?.platform || 'not available', 
    result: hasTelegram,
    isSSR: typeof navigator === 'undefined',
    isIframe: window !== window.parent,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'undefined',
    locationHref: typeof window.location !== 'undefined' ? window.location.href : 'undefined',
    locationOrigin: typeof window.location !== 'undefined' ? window.location.origin : 'undefined',
    currentTimeUTC: new Date().toISOString()
  });
  
  // В продакшене мы требуем все данные, но для разработки можно смягчить условия
  if (process.env.NODE_ENV === 'development') {
    // В режиме разработки не требуем наличия данных от Telegram
    return true;
  }
  
  return hasTelegram;
}

/**
 * Инициализирует Telegram WebApp с расширенной проверкой состояния и ошибок
 * @returns {boolean} true если инициализация прошла успешно
 */
/**
 * Активно запрашивает данные инициализации у Telegram WebApp
 * Полезно в случаях, когда данные не были получены автоматически
 * @returns {Promise<boolean>} true если удалось получить данные инициализации
 */
export async function requestInitData(): Promise<boolean> {
  console.log('[telegramService] Actively requesting initData from Telegram WebApp...');
  
  // Проверяем, доступен ли базовый объект Telegram.WebApp
  if (!window?.Telegram?.WebApp) {
    console.error('[telegramService] 🔴 Cannot request initData: Telegram.WebApp is not available');
    
    // Для отладки: выводим полную информацию о window.Telegram объекте
    console.log('[telegramService] DIAG: Telegram object state:', {
      telegramExists: !!window.Telegram,
      telegramType: typeof window.Telegram,
      telegramKeys: window.Telegram ? Object.keys(window.Telegram) : [],
      fullObj: window.Telegram
    });
    
    return false;
  }
  
  try {
    // Пытаемся переинициализировать Telegram WebApp
    window.Telegram.WebApp.ready();
    
    // Расширяем на весь экран
    window.Telegram.WebApp.expand();
    
    // Проверяем, появились ли данные инициализации после переинициализации
    const initData = window.Telegram.WebApp.initData;
    const initDataLength = initData ? initData.length : 0;
    
    // Детальное логирование после попытки переинициализации
    console.log('[telegramService] 📊 After reinitialization:', {
      initDataAvailable: !!initData,
      initDataLength: initDataLength,
      initDataSample: initData && initDataLength > 0 ? 
                    `${initData.substring(0, Math.min(20, initDataLength))}...` : 'empty',
      initDataUnsafeAvailable: !!window.Telegram.WebApp.initDataUnsafe,
      userAvailable: !!window.Telegram.WebApp.initDataUnsafe?.user,
      userId: window.Telegram.WebApp.initDataUnsafe?.user?.id || 'not available'
    });
    
    // Проверяем, появились ли данные о пользователе
    if (window.Telegram.WebApp.initDataUnsafe?.user?.id) {
      console.log('[telegramService] ✅ Successfully obtained user data after reinitialization!');
      
      // Публикуем событие об успешной инициализации
      const event = new CustomEvent('telegram-webapp-initialized', { 
        detail: { 
          userId: window.Telegram.WebApp.initDataUnsafe.user.id,
          // @ts-ignore
          startParam: window.Telegram.WebApp.startParam,
          initDataLength: initDataLength,
          wasReinitialized: true
        } 
      });
      window.dispatchEvent(event);
      
      return true;
    }
    
    console.warn('[telegramService] ⚠️ Reinitialization did not provide user data');
    return false;
  } catch (error) {
    console.error('[telegramService] 🔴 Error during initData request:', error);
    return false;
  }
}

export function initTelegramWebApp(): boolean {
  console.log('[telegramService] Initializing Telegram WebApp...');
  
  // Расширенное логирование для отладки проблем в production
  console.log('[telegramService] 📱 DEBUG: Current Telegram object state:', {
    telegramObjectExists: !!window.Telegram,
    webAppObjectExists: !!window.Telegram?.WebApp,
    initDataExists: !!window.Telegram?.WebApp?.initData,
    initDataLength: window.Telegram?.WebApp?.initData?.length || 0,
    initDataUnsafeExists: !!window.Telegram?.WebApp?.initDataUnsafe,
    userIdAvailable: !!window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
    runningInIframe: window !== window.parent,
    documentReferrer: document.referrer || 'none',
    locationHref: window.location.href,
    inIframe: window !== window.parent,
    userAgent: navigator.userAgent,
  });
  
  // Сразу сохраняем initData в localStorage, если оно доступно (согласно п.1.2 ТЗ)
  if (window.Telegram?.WebApp?.initData && window.Telegram.WebApp.initData.trim() !== '') {
    try {
      // Сначала сохраняем в sessionStorage (приоритетный способ)
      sessionStorage.setItem('telegramInitData', window.Telegram.WebApp.initData);
      // Также сохраняем в localStorage как резервную копию
      localStorage.setItem('telegramInitData', window.Telegram.WebApp.initData);
      
      console.log('[telegramService] Successfully saved Telegram initData to sessionStorage and localStorage with length:', 
        window.Telegram.WebApp.initData.length);
      
      // Сохраняем данные пользователя
      const unsafe = window.Telegram.WebApp.initDataUnsafe;
      if (unsafe) {
        sessionStorage.setItem('telegram_user_data', JSON.stringify(unsafe));
        if (unsafe.user?.id) {
          sessionStorage.setItem('telegram_user_id', unsafe.user.id.toString());
        }
      }
      
      console.log('[telegramService] initData сохранено в sessionStorage');
    } catch (e) {
      console.error('[telegramService] Error saving Telegram initData to storage:', e);
    }
  }
  
  // Проверяем доступность основного API
  if (!window?.Telegram?.WebApp) {
    console.error('[telegramService] Failed to initialize - WebApp API not available');
    
    // В режиме разработки это нормально
    if (process.env.NODE_ENV === 'development') {
      console.warn('[telegramService] ⚠️ Running in development mode without Telegram WebApp API');
      
      // Возможная эмуляция данных в режиме разработки (только через другие методы)
      try {
        // Проверяем localStorage на наличие сохраненного Telegram ID для отладки
        const cachedTelegramData = localStorage.getItem('telegram_user_data');
        if (cachedTelegramData) {
          console.log('[telegramService] Using cached Telegram data from localStorage for development');
          
          // Публикуем событие для остальных компонентов с cached данными
          try {
            const cachedData = JSON.parse(cachedTelegramData);
            if (cachedData.id) {
              const event = new CustomEvent('telegram-webapp-initialized', { 
                detail: { 
                  userId: parseInt(cachedData.id),
                  startParam: null,
                  fromCache: true
                } 
              });
              window.dispatchEvent(event);
              
              console.log('[telegramService] Published cached ID event:', parseInt(cachedData.id));
            }
          } catch (e) {
            console.error('[telegramService] Failed to parse cached telegram data:', e);
          }
        }
      } catch (storageError) {
        console.warn('[telegramService] Error accessing localStorage:', storageError);
      }
      
      return false;
    }
    
    console.error('[telegramService] ❌ Running in production without Telegram WebApp API!');
    return false;
  }
  
  try {
    // Попытка инициализации с проверкой на ошибки
    // Сначала вызываем ready(), чтобы сообщить Telegram, что приложение готово
    window.Telegram.WebApp.ready();
    
    // Затем расширяем приложение на весь экран
    window.Telegram.WebApp.expand();
    
    // Проверяем доступность данных пользователя после инициализации
    const hasUserData = !!window.Telegram.WebApp.initDataUnsafe?.user?.id;
    
    // Полная проверка состояния API после инициализации
    const apiState = isTelegramWebApp();
    
    // Сохраняем initData для анализа потенциальных проблем
    const initData = window.Telegram.WebApp.initData;
    const initDataLength = initData ? initData.length : 0;
    console.log(`[telegramService] Init data received (length: ${initDataLength})`);
    
    // Детальная проверка структуры initData
    if (initData && initData.length > 0) {
      // Если данные в формате query param, логируем ключи
      if (initData.includes('=') && initData.includes('&')) {
        try {
          const params = new URLSearchParams(initData);
          const keys = Array.from(params.keys());
          console.log('[telegramService] initData keys:', keys);
          
          // Проверяем наличие ключевых параметров
          const hasUser = params.has('user');
          const hasAuthDate = params.has('auth_date');
          const hasHash = params.has('hash');
          
          if (!hasUser || !hasAuthDate || !hasHash) {
            console.warn('[telegramService] Missing critical parameters in initData:', 
                         {hasUser, hasAuthDate, hasHash});
          }
        } catch (parseError) {
          console.error('[telegramService] Error parsing initData as URLSearchParams:', parseError);
        }
      } 
      // Если в другом формате, проверяем его структуру
      else {
        try {
          const initDataObj = JSON.parse(initData);
          console.log('[telegramService] initData parsed as JSON with keys:', Object.keys(initDataObj));
        } catch (jsonError) {
          console.warn('[telegramService] initData is not valid JSON, assuming custom format');
        }
      }
    }
    
    if (apiState) {
      console.log('[telegramService] ✅ Telegram WebApp initialized successfully');
      
      // Получаем и валидируем userId
      const userId = window.Telegram.WebApp.initDataUnsafe?.user?.id;
      console.log('[telegramService] User ID detected:', userId || 'none');
      
      if (userId) {
        // Сохраняем ID в localStorage для отладки и fallback
        try {
          localStorage.setItem('telegram_user_data', JSON.stringify({
            id: String(userId),
            timestamp: Date.now(),
            username: window.Telegram.WebApp.initDataUnsafe?.user?.username || ''
          }));
        } catch (e) {
          console.warn('[telegramService] Failed to cache telegram userId in localStorage:', e);
        }
      }
                  
      // Публикуем событие для остальных компонентов
      const event = new CustomEvent('telegram-webapp-initialized', { 
        detail: { 
          userId: userId || null,
          // @ts-ignore
          startParam: window.Telegram.WebApp.startParam,
          initDataLength: initDataLength
        } 
      });
      window.dispatchEvent(event);
      
      return true;
    } else {
      console.error('[telegramService] API initialized but validation failed');
      
      // Расширенная диагностика проблем с инициализацией
      console.warn('[telegramService] Detailed initData diagnostics:', {
        hasData: !!initData,
        dataLength: initDataLength,
        initDataPreview: initData && initData.length > 20 ? 
                         `${initData.substring(0, 10)}...${initData.substring(initData.length - 10)}` :
                         'too short or empty',
        hasInitDataUnsafe: !!window.Telegram.WebApp.initDataUnsafe,
        hasUser: !!window.Telegram.WebApp.initDataUnsafe?.user,
        hasValidUserId: typeof window.Telegram.WebApp.initDataUnsafe?.user?.id === 'number',
        userId: window.Telegram.WebApp.initDataUnsafe?.user?.id || 'invalid/missing'
      });
      
      // Если попытка инициализации не дала нужных данных, пробуем 
      // проверить конкретно, что именно отсутствует
      if (!window.Telegram.WebApp.initData || window.Telegram.WebApp.initData.trim() === '') {
        console.error('[telegramService] No initData available after initialization');
      }
      
      if (!window.Telegram.WebApp.initDataUnsafe) {
        console.error('[telegramService] No initDataUnsafe available after initialization');
      } else if (!window.Telegram.WebApp.initDataUnsafe?.user) {
        console.error('[telegramService] No user data available after initialization');
      }
      
      return false;
    }
  } catch (error) {
    console.error('[telegramService] Exception during Telegram WebApp initialization:', error);
    return false;
  }
}

// Интерфейс для данных пользователя из Telegram
interface TelegramUserData {
  userId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  authData: string;
}

/**
 * Получает данные пользователя из Telegram WebApp
 * @returns {TelegramUserData | null} Данные пользователя или null в случае ошибки
 */
export function getTelegramUserData(): TelegramUserData | null {
  console.log('[telegramService] getTelegramUserData called');
  
  // Шаг 1: Полная диагностика с подробным логированием состояния
  console.log('[telegramService] Telegram WebApp state diagnostic:', {
    windowDefined: typeof window !== 'undefined',
    telegramAvailable: !!window?.Telegram,
    webAppAvailable: !!window?.Telegram?.WebApp,
    initDataAvailable: !!window?.Telegram?.WebApp?.initData,
    initDataLength: typeof window?.Telegram?.WebApp?.initData === 'string' ? window.Telegram.WebApp.initData.length : 0,
    initDataUnsafeAvailable: !!window?.Telegram?.WebApp?.initDataUnsafe,
    userAvailable: !!window?.Telegram?.WebApp?.initDataUnsafe?.user,
    userIdAvailable: typeof window?.Telegram?.WebApp?.initDataUnsafe?.user?.id === 'number',
    // @ts-ignore - startParam может быть недоступен в типе, но доступен в реальном API
    startParamAvailable: !!window?.Telegram?.WebApp?.startParam,
    // @ts-ignore - startParam может быть недоступен в типе, но доступен в реальном API
    startParamValue: window?.Telegram?.WebApp?.startParam || 'none',
    platform: window?.Telegram?.WebApp?.platform || 'unknown'
  });
  
  // Добавляем в заголовки initData согласно требованиям задания 1.2 ТЗ
  if (window?.Telegram?.WebApp?.initData) {
    try {
      // Используем глобальную переменную, чтобы все последующие запросы имели нужный заголовок
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('telegramInitData', window.Telegram.WebApp.initData);
        console.log('[telegramService] Сохранен initData в localStorage для передачи в заголовках');
      }
    } catch (e) {
      console.error('[telegramService] Ошибка при сохранении initData:', e);
    }
  }
  
  // Шаг 2: Проверка базовой доступности API
  if (!isTelegramWebApp()) {
    console.warn('[telegramService] Telegram WebApp API not available');
    
    // Попытка переинициализации, если Telegram объект есть, но не прошел проверки
    if (window?.Telegram?.WebApp) {
      try {
        console.log('[telegramService] Attempting to reinitialize Telegram WebApp');
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        
        // Повторная проверка после переинициализации
        if (isTelegramWebApp()) {
          console.log('[telegramService] Successfully reinitialized Telegram WebApp');
        } else {
          console.warn('[telegramService] Failed to reinitialize Telegram WebApp');
          return null;
        }
      } catch (error) {
        console.error('[telegramService] Error during WebApp reinitialization:', error);
        return null;
      }
    } else {
      return null;
    }
  }
  
  // Шаг 3: Дополнительная проверка доступности initDataUnsafe
  if (!window.Telegram?.WebApp?.initDataUnsafe) {
    console.warn('[telegramService] initDataUnsafe not available, trying alternative methods');
    
    // Если initData есть, но initDataUnsafe нет, можно попробовать 
    // проверить startParam для получения дополнительной информации
    // @ts-ignore - startParam может быть недоступен в типе, но доступен в реальном API
    if (window.Telegram?.WebApp?.startParam) {
      // @ts-ignore - startParam может быть недоступен в типе, но доступен в реальном API
      console.log('[telegramService] No initDataUnsafe, but startParam available:', 
                  window.Telegram.WebApp.startParam);
    }
    
    return null;
  }

  try {
    // Шаг 4: Безопасное создание копии данных
    const initDataUnsafe = { ...window.Telegram.WebApp.initDataUnsafe };
    const user = initDataUnsafe.user;
    
    // Расширенное логирование всех доступных данных
    console.log('[telegramService] Full Telegram WebApp diagnostic:', { 
      hasUser: !!user,
      userId: typeof user?.id === 'number' ? user.id : 'invalid',
      username: user?.username || 'not available',
      firstName: user?.first_name || 'not available',
      lastName: user?.last_name || 'not available',
      initDataKeys: Object.keys(initDataUnsafe),
      // @ts-ignore - startParam может быть недоступен в типе, но доступен в реальном API
      startParam: window.Telegram?.WebApp?.startParam || 'not available',
      platform: window.Telegram?.WebApp?.platform || 'not available',
      // @ts-ignore - version может быть недоступен в типе, но доступен в реальном API
      version: window.Telegram?.WebApp?.version || 'not available',
      initDataLength: window.Telegram?.WebApp?.initData?.length || 0,
      // @ts-ignore - themeParams может быть недоступен в типе, но доступен в реальном API
      themeParams: window.Telegram?.WebApp?.themeParams ? 'available' : 'not available'
    });
    
    // Шаг 4: Проверка наличия объекта user и корректности данных
    if (!user || typeof user.id !== 'number' || user.id <= 0) {
      console.warn('[telegramService] User data not available or invalid in Telegram WebApp');
      return null;
    }

    // Шаг 5: Формирование данных пользователя
    const userData: TelegramUserData = {
      userId: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      photoUrl: user.photo_url,
      authData: window.Telegram.WebApp.initData  // Данные для проверки подписи на сервере
    };
    
    // Шаг 6: Кэширование данных в localStorage с метками времени
    try {
      if (userData.userId > 0) {
        // Сохраняем id с временной меткой для возможной валидации в будущем
        const cacheData = {
          id: String(userData.userId),
          timestamp: Date.now(),
          username: userData.username || '',
          firstName: userData.firstName || ''
        };
        
        localStorage.setItem('telegram_user_data', JSON.stringify(cacheData));
        console.log('[telegramService] Cached user data in localStorage:', userData.userId);
      }
    } catch (err) {
      console.warn('[telegramService] Failed to cache user data in localStorage:', err);
    }
    
    console.log('[telegramService] Successfully extracted user data:', {
      userId: userData.userId,
      username: userData.username || 'not set',
      firstName: userData.firstName || 'not set'
    });
    
    return userData;
  } catch (error) {
    console.error('[telegramService] Error extracting user data from Telegram WebApp:', error);
    return null;
  }
}

/**
 * Получает заголовки с данными аутентификации Telegram для запросов к API
 * @returns {Record<string, string>} Объект с заголовками или пустой объект, если данные Telegram недоступны
 */
export function getTelegramAuthHeaders(): Record<string, string> {
  console.log('[telegramService] Getting Telegram auth headers');
  
  // Шаг 1: Подготовим результат с заголовками и добавим поддержку dev-mode
  const headers: Record<string, string> = {};
  
  // Добавляем проверку метаданных для выявления устаревших данных
  try {
    // Проверка по временной метке, устаревшие данные старше 24 часов автоматически очищаются
    const timestampStr = localStorage.getItem(TELEGRAM_ID_TIMESTAMP_KEY);
    if (timestampStr) {
      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();
      const ageHours = (now - timestamp) / (1000 * 60 * 60);
      
      if (ageHours > 24) {
        console.warn(`[telegramService] ⚠️ Обнаружены устаревшие данные Telegram (возраст: ${ageHours.toFixed(1)} часов), очищаем кэш...`);
        clearTelegramCache();
      }
    }
    
    // Проверяем версию API и бота для выявления устаревших данных
    const cachedInitData = localStorage.getItem(TELEGRAM_INIT_DATA_KEY);
    if (cachedInitData) {
      // Проверка по хешу или метаданным, чтобы определить, от какого бота данные
      if (cachedInitData.includes('old_bot_marker') || 
          (cachedInitData.includes('auth_date') && !cachedInitData.includes('7980427501'))) {
        console.warn('[telegramService] ⚠️ Обнаружены данные от старого бота, очищаем кэш...');
        clearTelegramCache();
      }
    }
  } catch (e) {
    console.error('[telegramService] Ошибка при проверке актуальности данных:', e);
  }
  
  // Получаем initData из всех возможных источников
  let initData: string | null = null;
  
  // Приоритет источников:
  // 1. Напрямую из Telegram API (текущий сеанс)
  // 2. Из sessionStorage (сохраненные с текущего сеанса)
  // 3. Из localStorage (сохраненные с прошлых сеансов)
  
  // 1. Пробуем получить данные напрямую из Telegram API
  try {
    if (window?.Telegram?.WebApp?.initData) {
      initData = window.Telegram.WebApp.initData;
      console.log('[telegramService] получены данные из Telegram WebApp API (длина:', initData.length, ')');
      
      // Сохраняем свежие данные в обоих хранилищах для резервного копирования
      try {
        localStorage.setItem('telegramInitData', initData);
        sessionStorage.setItem('telegramInitData', initData);
        console.log('[telegramService] Свежие данные сохранены в обоих хранилищах');
      } catch (e) {
        console.error('[telegramService] Ошибка при сохранении данных в хранилище:', e);
      }
    }
  } catch (e) {
    console.error('[telegramService] Ошибка при получении данных из Telegram WebApp:', e);
  }
  
  // 2. Если не получили напрямую, пробуем из sessionStorage
  if (!initData) {
    try {
      const sessionData = sessionStorage.getItem('telegramInitData');
      if (sessionData) {
        initData = sessionData;
        console.log('[telegramService] Получены данные из sessionStorage (длина:', initData.length, ')');
      }
    } catch (e) {
      console.error('[telegramService] Ошибка при чтении данных из sessionStorage:', e);
    }
  }
  
  // 3. Если все еще нет данных, пробуем из localStorage
  if (!initData) {
    try {
      const localData = localStorage.getItem('telegramInitData');
      if (localData) {
        initData = localData;
        console.log('[telegramService] Получены данные из localStorage (длина:', initData.length, ')');
      }
    } catch (e) {
      console.error('[telegramService] Ошибка при чтении данных из localStorage:', e);
    }
  }
  
  // 4. Альтернативные ключи в хранилищах
  if (!initData) {
    try {
      // Проверяем альтернативные ключи
      const alternativeKeys = ['telegram_data', 'tg_init_data', 'tgInitData'];
      for (const key of alternativeKeys) {
        const data = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (data) {
          initData = data;
          console.log(`[telegramService] Получены данные из альтернативного ключа ${key} (длина:`, initData.length, ')');
          break;
        }
      }
    } catch (e) {
      console.error('[telegramService] Ошибка при чтении данных из альтернативных ключей:', e);
    }
  }
  
  // Если у нас есть initData (текущий или из localStorage), добавляем его в заголовки
  if (initData && initData.trim() !== '') {
    // Добавляем в нескольких вариантах для совместимости (согласно п.1.2 ТЗ)
    // Используем все возможные варианты названий заголовков для максимальной совместимости
    const headerVariants = [
      'telegram-init-data', 'Telegram-Init-Data', 'x-telegram-init-data', 'X-Telegram-Init-Data',
      'telegramInitData', 'telegram-data', 'x-telegram-data'
    ];
    
    // Добавляем все варианты заголовков
    headerVariants.forEach(headerName => {
      headers[headerName] = initData;
    });
    
    console.log('[telegramService] ✅ Added Telegram initData to headers (length:', initData.length + ')');
    
    // Для аудита сохраняем краткий образец данных
    const sampleStart = initData.substring(0, 20);
    const sampleEnd = initData.substring(initData.length - 20);
    console.log(`[telegramService] InitData sample: ${sampleStart}...${sampleEnd}`);
    
    // Добавляем информацию о том, был ли initData получен непосредственно из Telegram API
    // или загружен из localStorage (для отслеживания источника данных)
    const source = window.Telegram?.WebApp?.initData ? 'telegram-api' : 'localStorage';
    headers['X-Telegram-Data-Source'] = source;
    console.log(`[telegramService] Data source: ${source}`);
    
    // Пытаемся добавить доп. информацию для отладки, если данные в формате URL-параметров
    try {
      if (initData.includes('=') && initData.includes('&')) {
        const params = new URLSearchParams(initData);
        if (params.has('user')) {
          const user = JSON.parse(params.get('user') || '{}');
          if (user.id) {
            headers['X-Telegram-User-Id'] = String(user.id);
            console.log(`[telegramService] Added user.id from initData: ${user.id}`);
          }
        }
        
        if (params.has('auth_date')) {
          const authDate = params.get('auth_date');
          if (authDate) {
            headers['X-Telegram-Auth-Date'] = authDate;
            // Проверяем свежесть данных
            const authDateNum = parseInt(authDate);
            const nowSeconds = Math.floor(Date.now() / 1000);
            const ageHours = (nowSeconds - authDateNum) / 3600;
            console.log(`[telegramService] Auth data age: ${ageHours.toFixed(2)} hours`);
            
            // Если данные старше 24 часов, выводим предупреждение
            if (ageHours > 24) {
              console.warn(`[telegramService] ⚠️ WARNING: Telegram initData is ${ageHours.toFixed(1)} hours old!`);
            }
          }
        }
      }
    } catch (err) {
      console.error('[telegramService] Error extracting additional data from initData:', err);
    }
  } else {
    console.warn('[telegramService] ⚠️ No Telegram initData available to add to headers');
  }
  
  // Обработка случая, когда Telegram WebApp API недоступен
  if (!isTelegramWebApp()) {
    console.warn('[telegramService] Telegram WebApp API not available');
    
    // Добавляем диагностическую информацию для отладки
    const diagData = {
      isTelegramAvailable: false,
      isWebAppAvailable: false, 
      initDataLength: 0,
      hasInitDataUnsafe: false,
      hasUser: false,
      userId: "not available",
      username: "not available",
      firstName: "not available",
      startParam: "not available",
      authDate: "not available",
      platform: "not available",
      version: "not available",
      hash: "absent",
      fullInitData: "empty",
      documentURL: document?.URL || "unknown",
      isIframe: window !== window.parent,
      userAgent: navigator.userAgent,
      time: new Date().toISOString()
    };
    
    console.log('===[Telegram User ID Check]=== API недоступен, нет ID для передачи');
    console.log('[АУДИТ] [DIAG] Telegram WebApp State:', diagData);
    
    // В режиме разработки мы можем использовать тестовый ID
    if (process.env.NODE_ENV === 'development') {
      try {
        // Пробуем сначала получить из localStorage, если там есть сохраненные данные
        const cachedDataStr = localStorage.getItem('telegram_user_data');
        if (cachedDataStr) {
          try {
            const cachedData = JSON.parse(cachedDataStr);
            if (cachedData && cachedData.id) {
              headers['X-Development-User-Id'] = cachedData.id;
              headers['X-Telegram-User-Id'] = cachedData.id;
              console.log('[telegramService] [DEV] Using cached Telegram user ID:', cachedData.id);
            }
          } catch (e) {
            console.warn('[telegramService] [DEV] Error parsing cached data:', e);
          }
        }
        
        // Если в localStorage нет данных, используем дефолтный тестовый ID для разработки
        if (!headers['X-Telegram-User-Id']) {
          headers['X-Development-User-Id'] = '1';  // Используем тестовый ID = 1 как fallback
          headers['X-Telegram-User-Id'] = '1';
          console.log('[telegramService] [DEV] Using default test user ID: 1');
        }
      } catch (e) {
        console.warn('[telegramService] [DEV] Error accessing localStorage:', e);
        // Даже при ошибке локального хранилища гарантируем ID для разработки
        headers['X-Development-User-Id'] = '1';
        headers['X-Telegram-User-Id'] = '1';
      }
      
      // В режиме разработки указываем что используем тестовые заголовки
      headers['X-Development-Mode'] = 'true';
      return headers;
    }
    
    // В production просто возвращаем пустые заголовки, если API недоступен
    return headers;
  }
  
  // Шаг 2: Если API доступен - проверяем наличие initData
  if (typeof window.Telegram?.WebApp?.initData !== 'string' || window.Telegram.WebApp.initData.trim() === '') {
    console.error('[telegramService] CRITICAL! initData is not available or empty');
    
    // Расширенная диагностика
    console.error('[telegramService] initData diagnostic:', {
      isTelegramAvailable: !!window.Telegram,
      isWebAppAvailable: !!window.Telegram?.WebApp,
      initDataType: typeof window.Telegram?.WebApp?.initData,
      initDataEmpty: window.Telegram?.WebApp?.initData === '',
      initDataWhitespaceOnly: window.Telegram?.WebApp?.initData?.trim() === '',
      // @ts-ignore
      appVersion: window.Telegram?.WebApp?.version,
      platform: window.Telegram?.WebApp?.platform
    });
    
    // Попытка переинициализации
    try {
      console.log('[telegramService] Attempting to reinitialize Telegram WebApp for initData');
      
      // Убедимся, что Telegram WebApp доступен перед вызовом методов
      if (window?.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        
        // Повторная проверка после инициализации
        if (window.Telegram.WebApp.initData && window.Telegram.WebApp.initData.trim() !== '') {
          console.log('[telegramService] Successfully re-acquired initData');
        } else {
          console.error('[telegramService] Failed to re-acquire initData after reinitialization');
          
          // Проверим, может хотя бы userId доступен
          const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
          if (userId) {
            headers['X-Telegram-User-Id'] = String(userId);
            console.log('[telegramService] No initData, but got userId:', userId);
          }
          
          return headers; // Возвращаем частичные заголовки (возможно с userId)
        }
      } else {
        console.error('[telegramService] Telegram WebApp is not available for reinitialization');
        return headers; // Выход с пустыми заголовками
      }
    } catch (reinitError) {
      console.error('[telegramService] Error during reinitialization:', reinitError);
      return headers; // Выход с пустыми заголовками
    }
  }
  
  try {
    // Дополнительная проверка перед использованием
    if (!window?.Telegram?.WebApp?.initData) {
      console.error('[telegramService] initData still not available after reinit attempt');
      return headers;
    }
    
    // Логируем параметр start, если он есть в WebApp
    // @ts-ignore
    const startParam = window.Telegram.WebApp.startParam;
    if (startParam) {
      console.log('[telegramService] Detected startParam from Telegram WebApp:', startParam);
      
      // Добавляем в заголовки
      headers['X-Telegram-Start-Param'] = startParam;
      
      // Отправляем на сервер для регистрации
      try {
        fetch('/api/referral/register-start-param', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-start-param': startParam
          },
          body: JSON.stringify({ startParam })
        }).catch(err => console.error('[telegramService] Error sending startParam to server:', err));
      } catch (sendError) {
        console.warn('[telegramService] Failed to send startParam to server:', sendError);
      }
    }
    
    const initData = window.Telegram.WebApp.initData;
    
    // Шаг 3: Логирование информации для отладки (без полного раскрытия данных)
    const dataPreview = initData.length > 20 
      ? `${initData.substring(0, 10)}...${initData.substring(initData.length - 10)}`
      : 'too short';
    console.log('[telegramService] initData preview (length ' + initData.length + '):', dataPreview);
    
    // Шаг 4: Проверка валидности данных (базовая проверка на наличие ключевых параметров)
    const hasAuthDate = initData.includes('auth_date=');
    const hasHash = initData.includes('hash=');
    const hasUser = initData.includes('user=');
    
    // Расширенные данные о проверке
    const validationInfo = {
      hasAuthDate,
      hasHash, 
      hasUser,
      length: initData.length,
      isQuery: initData.includes('&') && initData.includes('='),
      containsQueryTerms: [
        'auth_date=', 'hash=', 'user=', 'query_id=', 'start_param=', 'platform='
      ].filter(term => initData.includes(term))
    };
    
    console.log('[telegramService] initData validation details:', validationInfo);
    
    if (!hasAuthDate || !hasHash) {
      console.warn('[telegramService] initData missing critical fields (auth_date or hash)');
      // Возвращаем данные даже если они не полные, сервер выполнит полную валидацию
    }
    
    // Шаг 5: Формирование заголовков для отправки на сервер
    // Важно! Передаем полные данные initData, без сокращений и модификаций
    headers['Telegram-Data'] = initData;
    // Обеспечиваем совместимость с различными способами получения данных на сервере
    headers['X-Telegram-Data'] = initData;
    headers['X-Telegram-Init-Data'] = initData;
    // Добавляем метку, что данные аутентификации Telegram присутствуют
    headers['X-Telegram-Auth'] = 'true';
    
    // Шаг 6: Добавление userId в заголовки (если доступен)
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (userId) {
      headers['X-Telegram-User-Id'] = String(userId);
      console.log('===[Telegram User ID Check]===', userId);
      
      // Сохраняем ID в localStorage для будущего использования в dev-mode
      try {
        const dataToStore = {
          id: String(userId),
          timestamp: Date.now(),
          // @ts-ignore
          platform: window.Telegram?.WebApp?.platform || 'unknown',
          username: window.Telegram?.WebApp?.initDataUnsafe?.user?.username || ''
        };
        localStorage.setItem('telegram_user_data', JSON.stringify(dataToStore));
      } catch (e) {
        console.warn('[telegramService] Error saving userId to localStorage:', e);
      }
    } else {
      console.log('===[Telegram User ID Check]=== ID не найден в initDataUnsafe');
    }
    
    // Шаг 7: Добавить больше диагностической информации, если доступно
    // @ts-ignore - platform может быть недоступен в типе 
    const platform = window.Telegram?.WebApp?.platform;
    if (platform) {
      headers['X-Telegram-Platform'] = platform;
    }
    
    console.log('[telegramService] Auth headers prepared successfully:', Object.keys(headers));
    return headers;
  } catch (error) {
    console.error('[telegramService] Error getting Telegram auth headers:', error);
    
    // При ошибке пробуем добавить хотя бы ID пользователя, если доступен
    try {
      const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (userId) {
        headers['X-Telegram-User-Id'] = String(userId);
      }
    } catch (e) {
      console.error('[telegramService] Error getting userId as fallback:', e);
    }
    
    return headers;
  }
}

// Получает имя пользователя из Telegram WebApp для отображения
/**
 * Получает ID пользователя из Telegram WebApp или кэша в localStorage
 * @param {boolean} [forceRevalidate=false] - Если true, перепроверит данные из Telegram WebApp
 * @returns {string | null} ID пользователя в виде строки или null, если ID не доступен
 */
export function getCachedTelegramUserId(forceRevalidate: boolean = false): string | null {
  console.log('[telegramService] Getting telegram user ID, forceRevalidate:', forceRevalidate);
  
  // АУДИТ: Расширенная диагностика памяти и доступности Telegram WebApp
  console.log('[АУДИТ] [telegramService] Telegram WebApp state before getting ID:', {
    windowDefined: typeof window !== 'undefined',
    telegramAvailable: !!window?.Telegram,
    webAppAvailable: !!window?.Telegram?.WebApp,
    initDataAvailable: !!window?.Telegram?.WebApp?.initData,
    initDataLength: typeof window?.Telegram?.WebApp?.initData === 'string' ? window.Telegram.WebApp.initData.length : 0,
    userAvailable: !!window?.Telegram?.WebApp?.initDataUnsafe?.user,
    hasLocalStorage: typeof localStorage !== 'undefined',
    hasCachedData: typeof localStorage !== 'undefined' ? 
                  !!localStorage.getItem('telegram_user_data') : false,
    hasLegacyCache: typeof localStorage !== 'undefined' ?
                   !!localStorage.getItem('telegram_user_id') : false
  });
  
  // Шаг 1: Если запрошена перепроверка или это первый вызов, пробуем получить прямо из Telegram WebApp
  if (forceRevalidate || !localStorage.getItem('telegram_user_data')) {
    console.log('[АУДИТ] [telegramService] Trying to get fresh user data from Telegram WebApp');
    const telegramData = getTelegramUserData();
    if (telegramData?.userId) {
      console.log('[telegramService] Returning fresh user ID from Telegram WebApp:', telegramData.userId);
      return String(telegramData.userId);
    } else {
      console.warn('[АУДИТ] [telegramService] Failed to get fresh user data from Telegram WebApp');
    }
  }
  
  // Шаг 2: Пробуем получить из нового формата кэша (telegram_user_data)
  try {
    const cachedDataStr = localStorage.getItem('telegram_user_data');
    if (cachedDataStr) {
      try {
        const cachedData = JSON.parse(cachedDataStr);
        
        // Проверяем, что данные корректны и не старше 24 часов
        const isValid = 
          cachedData && 
          typeof cachedData.id === 'string' && 
          cachedData.id.trim() !== '' &&
          cachedData.timestamp && 
          (Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000);
        
        if (isValid) {
          console.log('[telegramService] Returning valid cached user ID:', cachedData.id);
          return cachedData.id;
        } else {
          console.warn('[telegramService] Cached user data is invalid or expired');
        }
      } catch (parseErr) {
        console.error('[telegramService] Error parsing cached user data:', parseErr);
      }
    }
    
    // Шаг 3: Пробуем получить из старого формата кэша (для обратной совместимости)
    const legacyCachedId = localStorage.getItem('telegram_user_id');
    if (legacyCachedId && legacyCachedId.trim() !== '') {
      console.log('[telegramService] Returning legacy cached user ID:', legacyCachedId);
      
      // Мигрируем данные в новый формат, если возможно
      try {
        const cacheData = {
          id: legacyCachedId,
          timestamp: Date.now(),
          username: '',
          firstName: ''
        };
        localStorage.setItem('telegram_user_data', JSON.stringify(cacheData));
        console.log('[telegramService] Migrated legacy user ID to new format');
      } catch (migrationErr) {
        console.warn('[telegramService] Failed to migrate legacy user ID:', migrationErr);
      }
      
      return legacyCachedId;
    }
  } catch (err) {
    console.warn('[telegramService] Error accessing localStorage:', err);
  }
  
  console.log('[telegramService] No valid user ID available');
  return null;
}

/**
 * Получает отображаемое имя пользователя из Telegram WebApp
 * @returns {string} Отображаемое имя пользователя
 */
export function getTelegramUserDisplayName(): string {
  // Шаг 1: Попытка получить данные напрямую из Telegram WebApp
  const userData = getTelegramUserData();
  
  if (userData) {
    // Приоритет 1: Имя (first_name)
    if (userData.firstName && userData.firstName.trim() !== '') {
      return userData.firstName;
    }
    
    // Приоритет 2: Имя пользователя (username)
    if (userData.username && userData.username.trim() !== '') {
      return userData.username;
    }
    
    // Приоритет 3: ID пользователя
    if (userData.userId) {
      return `Пользователь ${userData.userId}`;
    }
  }
  
  // Шаг 2: Если прямое получение не сработало, пробуем из кэша
  try {
    // Попытка получить данные из нового формата кэша
    const cachedDataStr = localStorage.getItem('telegram_user_data');
    if (cachedDataStr) {
      try {
        const cachedData = JSON.parse(cachedDataStr);
        
        // Приоритет 1: Имя из кэша
        if (cachedData.firstName && cachedData.firstName.trim() !== '') {
          return cachedData.firstName;
        }
        
        // Приоритет 2: Имя пользователя из кэша
        if (cachedData.username && cachedData.username.trim() !== '') {
          return cachedData.username;
        }
        
        // Приоритет 3: ID из кэша
        if (cachedData.id && cachedData.id.trim() !== '') {
          return `Пользователь ${cachedData.id}`;
        }
      } catch (parseErr) {
        console.warn('[telegramService] Error parsing cached user data for display name:', parseErr);
      }
    }
    
    // Шаг 3: Старый формат кэша (только ID)
    const cachedId = localStorage.getItem('telegram_user_id');
    if (cachedId && cachedId.trim() !== '') {
      return `Пользователь ${cachedId}`;
    }
  } catch (err) {
    console.warn('[telegramService] Error accessing localStorage for display name:', err);
  }
  
  // Шаг 4: Если всё остальное не сработало, возвращаем общее имя
  return 'Пользователь';
}

/**
 * Регистрирует пользователя через Telegram API
 * Использует данные initData для аутентификации и регистрации пользователя
 * 
 * @param {string} refCode - Реферальный код для привязки нового пользователя (необязательно)
 * @returns {Promise<{success: boolean, user_id?: number, message?: string}>} Результат регистрации
 */
/**
 * Логирует запуск Mini App в системе (Этап 5.1 ТЗ)
 * Отправляет информацию о запуске в базу данных через API
 * 
 * @returns {Promise<boolean>} true если логирование успешно выполнено
 */
export async function logAppLaunch(): Promise<boolean> {
  console.log('[telegramService] Logging Mini App launch...');
  
  try {
    // Получаем информацию о пользователе из Telegram WebApp
    const userData = getTelegramUserData();
    if (!userData || !userData.userId) {
      console.warn('[telegramService] Cannot log launch: missing user data');
      return false;
    }
    
    // Получаем параметр запуска (может содержать реферальный код)
    const startParam = window.Telegram?.WebApp?.startParam || '';
    
    // Получаем initData для передачи на сервер (ограничиваем длину для безопасности)
    const initData = window.Telegram?.WebApp?.initData || '';
    const truncatedInitData = initData.length > 1000 ? 
      initData.substring(0, 1000) + '...[truncated]' : 
      initData;
    
    // Получаем информацию о платформе
    const platform = window.Telegram?.WebApp?.platform || 
                    (typeof navigator !== 'undefined' ? navigator.platform : 'unknown');
    
    // Подготавливаем данные для логирования
    const launchData = {
      telegram_user_id: userData.userId,
      ref_code: startParam,
      platform,
      timestamp: new Date().toISOString(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      init_data: truncatedInitData
    };
    
    console.log('[telegramService] Sending launch log data:', {
      telegram_user_id: launchData.telegram_user_id,
      platform: launchData.platform,
      ref_code: launchData.ref_code || 'none'
    });
    
    // Отправляем данные на сервер
    const response = await fetch('/api/log-launch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getTelegramAuthHeaders()
      },
      body: JSON.stringify(launchData)
    });
    
    // Проверяем успешность запроса
    if (response.ok) {
      const result = await response.json();
      console.log('[telegramService] Launch logged successfully:', result);
      return true;
    } else {
      // Если превышен лимит запросов, тихо игнорируем
      if (response.status === 429) {
        console.warn('[telegramService] Rate limit exceeded for launch logging');
        return false;
      }
      
      console.error('[telegramService] Failed to log launch:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('[telegramService] Error logging app launch:', error);
    return false;
  }
}

export async function registerUserWithTelegram(refCode?: string): Promise<{
  success: boolean;
  user_id?: number;
  message?: string;
}> {
  console.log('[telegramService] Registering user with Telegram...');
  
  try {
    // Проверяем, запущены ли мы в среде Telegram
    if (!isRunningInTelegram()) {
      console.error('[telegramService] Cannot register user: not running in Telegram environment');
      return {
        success: false,
        message: 'Регистрация возможна только через Telegram Mini App'
      };
    }
    
    // Получаем данные пользователя Telegram
    const userData = getTelegramUserData();
    if (!userData) {
      console.error('[telegramService] Cannot register user: failed to get Telegram user data');
      return {
        success: false,
        message: 'Не удалось получить данные пользователя из Telegram'
      };
    }
    
    // Получаем initData для отправки на сервер
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData || initData.trim() === '') {
      console.error('[telegramService] Cannot register user: initData is empty');
      return {
        success: false,
        message: 'Отсутствуют данные инициализации Telegram'
      };
    }
    
    // Создаем тело запроса
    const requestBody = {
      telegram_user_id: userData.userId,
      username: userData.username || '',
      first_name: userData.firstName || '',
      last_name: userData.lastName || '',
      photo_url: userData.photoUrl || '',
      ref_code: refCode || window.Telegram?.WebApp?.startParam || '',
      init_data: initData
    };
    
    console.log('[telegramService] Sending registration request with data:', {
      telegram_user_id: requestBody.telegram_user_id,
      username: requestBody.username,
      ref_code: requestBody.ref_code
    });
    
    // Отправляем запрос на сервер
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getTelegramAuthHeaders()
      },
      body: JSON.stringify(requestBody)
    });
    
    // Обрабатываем ответ
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('[telegramService] User successfully registered:', result);
      
      // Сохраняем информацию о регистрации в localStorage
      try {
        localStorage.setItem(TELEGRAM_REGISTERED_KEY, 'true');
        if (result.user_id) {
          localStorage.setItem(TELEGRAM_USER_ID_KEY, result.user_id.toString());
        }
      } catch (e) {
        console.warn('[telegramService] Failed to save registration status:', e);
      }
      
      return {
        success: true,
        user_id: result.user_id,
        message: result.message || 'Регистрация успешно завершена'
      };
    } else {
      console.error('[telegramService] Failed to register user:', result);
      return {
        success: false,
        message: result.message || 'Ошибка при регистрации пользователя'
      };
    }
  } catch (error) {
    console.error('[telegramService] Registration error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка при регистрации'
    };
  }
}