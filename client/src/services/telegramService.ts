/**
 * Сервис для работы с Telegram WebApp
 */

// Проверяет, запущено ли приложение в Telegram WebApp
export function isTelegramWebApp(): boolean {
  return window.Telegram?.WebApp !== undefined;
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
  if (!isTelegramWebApp() || !window.Telegram?.WebApp?.initDataUnsafe) {
    return null;
  }

  try {
    const { user, auth_date, hash } = window.Telegram.WebApp.initDataUnsafe;
    
    if (!user) {
      console.warn('User data not available in Telegram WebApp');
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
    
    return userData;
  } catch (error) {
    console.error('Error extracting user data from Telegram WebApp:', error);
    return null;
  }
}

/**
 * Получает заголовки с данными аутентификации Telegram для запросов к API
 * @returns Объект с заголовками или пустой объект, если данные Telegram недоступны
 */
export function getTelegramAuthHeaders(): Record<string, string> {
  if (!isTelegramWebApp() || !window.Telegram?.WebApp?.initData) {
    return {};
  }
  
  try {
    return {
      'x-telegram-init-data': window.Telegram.WebApp.initData
    };
  } catch (error) {
    console.error('Error getting Telegram auth headers:', error);
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