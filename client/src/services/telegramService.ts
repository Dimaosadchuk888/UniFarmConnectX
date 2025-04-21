/**
 * Сервис для работы с Telegram WebApp
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
      };
    };
  }
}

/**
 * Проверяет, запущено ли приложение в Telegram WebApp и доступны ли все необходимые свойства API
 * @returns {boolean} true если Telegram WebApp API доступен и содержит необходимые данные
 */
/**
 * Проверяет, запущено ли приложение в реальной среде Telegram Mini App
 * Эта функция является более простой проверкой, чем isTelegramWebApp().
 * Она проверяет только минимальные свойства, чтобы определить, запущено ли 
 * приложение в Telegram Mini App или же в обычном браузере.
 * 
 * @returns {boolean} true если приложение запущено в Telegram Mini App
 */
export function isRunningInTelegram(): boolean {
  // Проверяем наличие объекта Telegram и WebApp
  const hasTelegramObject = !!window.Telegram;
  const hasWebAppObject = !!window.Telegram?.WebApp;
  
  // В режиме разработки сначала проверяем параметр в URL для эмуляции
  if (process.env.NODE_ENV === 'development') {
    // Специальный параметр URL для эмуляции Telegram в режиме разработки
    const urlParams = new URLSearchParams(window.location.search);
    const emulateTelegram = urlParams.get('telegram_mode') === 'true';
    
    // Для тестирования: если передан параметр, эмулируем Telegram
    if (emulateTelegram) {
      console.log('[telegramService] Emulating Telegram environment via URL param');
      return true;
    }
    
    // Если включена специальная отладка в localStorage
    try {
      const debugMode = localStorage.getItem('telegram_debug_mode') === 'true';
      if (debugMode) {
        console.log('[telegramService] Telegram debug mode active via localStorage');
        return true;
      }
    } catch (e) {
      // Игнорируем ошибки доступа к localStorage
    }
  }
  
  // Быстрая проверка - в Telegram наше приложение запускается в iframe
  const isInIframe = window !== window.parent;
  
  // Проверяем наличие Telegram-специфичных заголовков в куках или UserAgent
  const userAgent = navigator.userAgent.toLowerCase();
  const isTelegramUA = userAgent.includes('telegram') || 
                      userAgent.includes('tgweb') || 
                      document.referrer.includes('telegram');
  
  // Если есть прямые индикаторы Telegram, возвращаем true
  if (hasTelegramObject && hasWebAppObject) {
    console.log('[telegramService] Running in Telegram: WebApp API detected');
    return true;
  }
  
  // Если страница запущена в iframe и референсом является телеграм, это вероятно MiniApp
  if (isInIframe && isTelegramUA) {
    console.log('[telegramService] Likely running in Telegram: iframe + Telegram UserAgent');
    return true;
  }
  
  // В режиме разработки всегда возвращаем false, чтобы показать обычную версию страницы
  if (process.env.NODE_ENV === 'development') {
    return false;
  }
  
  // В продакшене, более агрессивно определяем запуск в Telegram
  // Если мы в iframe, вероятно это телеграм
  if (isInIframe) {
    console.log('[telegramService] Assuming Telegram environment: running in iframe');
    return true;
  }
  
  return false;
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
export function initTelegramWebApp(): boolean {
  console.log('[telegramService] Initializing Telegram WebApp...');
  
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
    headers['Telegram-Data'] = initData;
    headers['X-Telegram-Data'] = initData.length > 1000 ? dataPreview : initData; // Ограничиваем длину для совместимости
    headers['X-Telegram-Init-Data'] = initData.substring(0, 100) + '...'; // Укороченная версия 
    headers['X-Telegram-Auth'] = 'true'; // Дополнительный маркер для сервера
    
    // Шаг 6: Добавление userId в заголовки (если доступен)
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (userId) {
      headers['X-Telegram-User-Id'] = String(userId);
      
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