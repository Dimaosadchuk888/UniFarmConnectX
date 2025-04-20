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

// Проверяет, запущено ли приложение в Telegram WebApp
export function isTelegramWebApp(): boolean {
  const hasTelegram = !!(
    typeof window !== 'undefined' &&
    window.Telegram &&
    window.Telegram.WebApp &&
    typeof window.Telegram.WebApp.initData === 'string' &&
    window.Telegram.WebApp.initData !== ''
  );
  
  console.log('[telegramService] isTelegramWebApp check:', {
    windowDefined: typeof window !== 'undefined',
    hasTelegramObject: !!(window?.Telegram),
    hasWebAppObject: !!(window?.Telegram?.WebApp),
    hasInitData: !!(window?.Telegram?.WebApp?.initData),
    initDataLength: window?.Telegram?.WebApp?.initData?.length || 0,
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

// Получает данные пользователя из Telegram WebApp
export function getTelegramUserData(): TelegramUserData | null {
  console.log('[telegramService] getTelegramUserData called');
  
  if (!window.Telegram?.WebApp?.initDataUnsafe) {
    console.warn('[telegramService] initDataUnsafe not available');
    return null;
  }

  try {
    // Делаем копию данных, чтобы избежать возможных ошибок при обращении к свойствам
    const initDataUnsafe = { ...window.Telegram.WebApp.initDataUnsafe };
    const user = initDataUnsafe.user;
    
    console.log('[telegramService] initDataUnsafe:', { 
      hasUser: !!user,
      userId: user?.id,
      username: user?.username,
      firstName: user?.first_name,
      lastName: user?.last_name,
      initDataKeys: Object.keys(initDataUnsafe)
    });
    
    if (!user) {
      console.warn('[telegramService] User data not available in Telegram WebApp');
      return null;
    }

    // Мы используем типы, определенные в main.tsx 
    // Формируем данные, которые будут отправлены на сервер
    const userData: TelegramUserData = {
      userId: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      photoUrl: user.photo_url,
      authData: window.Telegram.WebApp.initData  // Данные для проверки подписи на сервере
    };
    
    // Кэшируем userId в localStorage для дополнительной надежности
    try {
      if (userData.userId) {
        localStorage.setItem('telegram_user_id', String(userData.userId));
        console.log('[telegramService] Cached userId in localStorage:', userData.userId);
      }
    } catch (err) {
      console.warn('[telegramService] Failed to cache userId in localStorage:', err);
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
 * @returns Объект с заголовками или пустой объект, если данные Telegram недоступны
 */
export function getTelegramAuthHeaders(): Record<string, string> {
  console.log('[telegramService] Getting Telegram auth headers');
  
  if (!window.Telegram?.WebApp?.initData) {
    console.warn('[telegramService] initData is not available');
    return {};
  }
  
  try {
    const initData = window.Telegram.WebApp.initData;
    
    // Логируем часть данных (не полностью, чтобы не раскрывать секретную информацию)
    console.log('[telegramService] initData preview:', 
      initData.length > 20 ? 
      `${initData.substring(0, 10)}...${initData.substring(initData.length - 10)}` :
      'too short');
    
    // Добавляем данные в заголовки для передачи на сервер
    const headers = {
      'x-telegram-init-data': initData
    };
    
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
 * @returns ID пользователя или null
 */
export function getCachedTelegramUserId(): string | null {
  console.log('[telegramService] Getting cached user ID');
  
  // Сначала пробуем получить из Telegram WebApp
  const telegramData = getTelegramUserData();
  if (telegramData?.userId) {
    console.log('[telegramService] Returning user ID from Telegram WebApp:', telegramData.userId);
    return String(telegramData.userId);
  }
  
  // Если не получилось, пробуем достать из localStorage
  try {
    const cachedId = localStorage.getItem('telegram_user_id');
    if (cachedId) {
      console.log('[telegramService] Returning cached user ID from localStorage:', cachedId);
      return cachedId;
    }
  } catch (err) {
    console.warn('[telegramService] Error accessing localStorage:', err);
  }
  
  console.log('[telegramService] No user ID available');
  return null;
}

export function getTelegramUserDisplayName(): string {
  const userData = getTelegramUserData();
  
  if (!userData) {
    // Пробуем получить ID из кэша для улучшенного отображения
    const cachedId = getCachedTelegramUserId();
    if (cachedId) {
      return `Пользователь ${cachedId}`;
    }
    return 'Пользователь';
  }
  
  if (userData.firstName) {
    return userData.firstName;
  }
  
  if (userData.username) {
    return userData.username;
  }
  
  return `User ${userData.userId}`;
}