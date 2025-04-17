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

    // Формируем данные, которые будут отправлены на сервер
    return {
      userId: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      photoUrl: user.photo_url,
      authData: window.Telegram.WebApp.initData  // Данные для проверки подписи на сервере
    };
  } catch (error) {
    console.error('Error extracting user data from Telegram WebApp:', error);
    return null;
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