/**
 * Сервис для работы с Telegram WebApp
 */

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
export function getTelegramUserDisplayName(): string {
  const userData = getTelegramUserData();
  
  if (!userData) {
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