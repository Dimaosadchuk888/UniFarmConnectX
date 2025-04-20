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
export function isTelegramWebApp(): boolean {
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
  }
  
  // Шаг 5: Проверка наличия объекта initDataUnsafe
  const hasInitDataUnsafe = !!window.Telegram.WebApp.initDataUnsafe;
  
  if (!hasInitDataUnsafe) {
    console.error('[telegramService] isTelegramWebApp check: initDataUnsafe is missing');
  }
  
  // Шаг 6: Проверка наличия объекта user в initDataUnsafe
  const hasUser = !!window.Telegram.WebApp.initDataUnsafe?.user;
  
  if (!hasUser && hasInitDataUnsafe) {
    console.error('[telegramService] isTelegramWebApp check: user object is missing in initDataUnsafe');
  }
  
  // Шаг 7: Проверка наличия id пользователя
  const hasUserId = typeof window.Telegram.WebApp.initDataUnsafe?.user?.id === 'number';
  
  if (!hasUserId && hasUser) {
    console.error('[telegramService] isTelegramWebApp check: user.id is missing or not a number');
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
    
    if (apiState) {
      console.log('[telegramService] ✅ Telegram WebApp initialized successfully');
      console.log('[telegramService] User ID detected:', 
                  window.Telegram.WebApp.initDataUnsafe?.user?.id || 'none');
                  
      // Публикуем событие для остальных компонентов
      const event = new CustomEvent('telegram-webapp-initialized', { 
        detail: { 
          userId: window.Telegram.WebApp.initDataUnsafe?.user?.id || null,
          // @ts-ignore
          startParam: window.Telegram.WebApp.startParam 
        } 
      });
      window.dispatchEvent(event);
      
      return true;
    } else {
      console.error('[telegramService] API initialized but validation failed');
      
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
  
  // Шаг 1: Проверка доступности Telegram WebApp API
  if (!isTelegramWebApp()) {
    console.warn('[telegramService] Telegram WebApp API not available');
    return {};
  }
  
  // Шаг 2: Проверка наличия initData
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
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      
      // Повторная проверка после инициализации
      if (window.Telegram?.WebApp?.initData && window.Telegram.WebApp.initData.trim() !== '') {
        console.log('[telegramService] Successfully re-acquired initData');
      } else {
        console.error('[telegramService] Failed to re-acquire initData after reinitialization');
        return {}; // Выход, так как данные не получены
      }
    } catch (reinitError) {
      console.error('[telegramService] Error during reinitialization:', reinitError);
      return {}; // Выход, так как была ошибка инициализации
    }
  }
  
  try {
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
    const headers: Record<string, string> = {
      'Telegram-Data': initData,
      'X-Telegram-Auth': 'true' // Дополнительный маркер для сервера
    };
    
    // Шаг 6: Добавление userId в заголовки (если доступен) для дополнительной проверки
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (userId) {
      headers['X-Telegram-User-Id'] = String(userId);
    }
    
    // Шаг 7: Добавить больше диагностической информации, если доступно
    // @ts-ignore - startParam может быть недоступен в типе
    if (window.Telegram?.WebApp?.startParam) {
      // @ts-ignore
      headers['X-Telegram-Start-Param'] = window.Telegram.WebApp.startParam;
    }
    
    // @ts-ignore - platform может быть недоступен в типе 
    if (window.Telegram?.WebApp?.platform) {
      // @ts-ignore
      headers['X-Telegram-Platform'] = window.Telegram.WebApp.platform;
    }
    
    console.log('[telegramService] Auth headers prepared successfully:', Object.keys(headers));
    return headers;
  } catch (error) {
    console.error('[telegramService] Error getting Telegram auth headers:', error);
    return {};
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
  
  // Шаг 1: Если запрошена перепроверка или это первый вызов, пробуем получить прямо из Telegram WebApp
  if (forceRevalidate || !localStorage.getItem('telegram_user_data')) {
    const telegramData = getTelegramUserData();
    if (telegramData?.userId) {
      console.log('[telegramService] Returning fresh user ID from Telegram WebApp:', telegramData.userId);
      return String(telegramData.userId);
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