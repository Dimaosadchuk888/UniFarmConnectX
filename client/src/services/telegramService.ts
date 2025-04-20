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
    return false;
  }
  
  // Шаг 2: Проверка доступности объекта Telegram
  if (!window.Telegram) {
    console.log('[telegramService] isTelegramWebApp check: Telegram object not available');
    return false;
  }
  
  // Шаг 3: Проверка доступности объекта WebApp
  if (!window.Telegram.WebApp) {
    console.log('[telegramService] isTelegramWebApp check: WebApp object not available');
    return false;
  }
  
  // Шаг 4: Проверка доступности initData и его непустоты
  const hasValidInitData = typeof window.Telegram.WebApp.initData === 'string' && 
                         window.Telegram.WebApp.initData.trim() !== '';
  
  // Шаг 5: Проверка наличия объекта initDataUnsafe
  const hasInitDataUnsafe = !!window.Telegram.WebApp.initDataUnsafe;
  
  // Финальный результат
  const hasTelegram = hasValidInitData && hasInitDataUnsafe;
  
  // Расширенное логирование для отладки
  console.log('[telegramService] isTelegramWebApp check:', {
    windowDefined: typeof window !== 'undefined',
    hasTelegramObject: !!window.Telegram,
    hasWebAppObject: !!window.Telegram.WebApp,
    hasInitData: typeof window.Telegram.WebApp.initData === 'string',
    initDataLength: (window.Telegram.WebApp.initData || '').length,
    hasInitDataUnsafe: hasInitDataUnsafe,
    result: hasTelegram
  });
  
  return hasTelegram;
}

// Инициализирует Telegram WebApp
export function initTelegramWebApp(): void {
  if (isTelegramWebApp()) {
    try {
      window.Telegram?.WebApp?.expand();
      window.Telegram?.WebApp?.ready();
      console.log('Telegram WebApp initialized successfully');
    } catch (error) {
      console.error('Error initializing Telegram WebApp:', error);
    }
  } else {
    console.warn('Telegram WebApp API не доступен');
    
    // Вывести уведомление в консоль только в режиме разработки
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Telegram WebApp not available (normal when running outside Telegram)');
    }
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
  
  // Шаг 1: Проверка базовой доступности API
  if (!isTelegramWebApp()) {
    console.warn('[telegramService] Telegram WebApp API not available');
    return null;
  }
  
  // Шаг 2: Дополнительная проверка доступности initDataUnsafe
  if (!window.Telegram?.WebApp?.initDataUnsafe) {
    console.warn('[telegramService] initDataUnsafe not available');
    return null;
  }

  try {
    // Шаг 3: Безопасное создание копии данных
    const initDataUnsafe = { ...window.Telegram.WebApp.initDataUnsafe };
    const user = initDataUnsafe.user;
    
    // Расширенное логирование
    console.log('[telegramService] initDataUnsafe:', { 
      hasUser: !!user,
      userId: typeof user?.id === 'number' ? user.id : 'invalid',
      username: user?.username || 'not available',
      firstName: user?.first_name || 'not available',
      lastName: user?.last_name || 'not available',
      initDataKeys: Object.keys(initDataUnsafe)
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
    console.warn('[telegramService] initData is not available or empty');
    return {};
  }
  
  try {
    const initData = window.Telegram.WebApp.initData;
    
    // Шаг 3: Логирование информации для отладки (без полного раскрытия данных)
    const dataPreview = initData.length > 20 
      ? `${initData.substring(0, 10)}...${initData.substring(initData.length - 10)}`
      : 'too short';
    console.log('[telegramService] initData preview:', dataPreview);
    
    // Шаг 4: Проверка валидности данных (базовая проверка на наличие ключевых параметров)
    const hasAuthDate = initData.includes('auth_date=');
    const hasHash = initData.includes('hash=');
    
    if (!hasAuthDate || !hasHash) {
      console.warn('[telegramService] initData missing critical fields (auth_date or hash)');
      // Возвращаем данные даже если они не полные, сервер выполнит полную валидацию
    }
    
    // Шаг 5: Формирование заголовков для отправки на сервер
    const headers: Record<string, string> = {
      'Telegram-Data': initData
    };
    
    // Шаг 6: Добавление userId в заголовки (если доступен) для дополнительной проверки
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (userId) {
      headers['x-telegram-user-id'] = String(userId);
    }
    
    console.log('[telegramService] Auth headers prepared successfully');
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