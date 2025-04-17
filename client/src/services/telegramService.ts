/**
 * Сервис для работы с Telegram WebApp API
 */

/**
 * Интерфейс для данных пользователя Telegram
 */
export interface TelegramUserData {
  id: number;
  first_name?: string;
  username?: string;
  language_code?: string;
  auth_date: number;
  hash: string;
}

/**
 * Интерфейс для полных данных, которые отправляются серверу
 */
export interface TelegramAuthData {
  user: TelegramUserData;
  authData: string;
}

/**
 * Получает данные пользователя Telegram из initDataUnsafe
 * @returns Объект с данными пользователя Telegram или null, если WebApp API недоступен
 */
export function getTelegramUserData(): TelegramAuthData | null {
  try {
    if (!window.Telegram || !window.Telegram.WebApp) {
      console.warn('Telegram WebApp API не доступен');
      return null;
    }

    // Расширяем window.Telegram.WebApp для доступа к initDataUnsafe
    const webApp = window.Telegram.WebApp as any;
    
    // Получаем initData строку
    const initData = webApp.initData || '';
    
    // Получаем данные из initDataUnsafe
    if (webApp.initDataUnsafe && webApp.initDataUnsafe.user) {
      const user = webApp.initDataUnsafe.user;
      
      // Формируем объект с данными пользователя
      const userData: TelegramUserData = {
        id: user.id,
        first_name: user.first_name,
        username: user.username,
        language_code: user.language_code,
        auth_date: webApp.initDataUnsafe.auth_date,
        hash: webApp.initDataUnsafe.hash
      };

      return {
        user: userData,
        authData: initData
      };
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка при получении данных пользователя Telegram:', error);
    return null;
  }
}

/**
 * Проверяет, запущено ли приложение в Telegram WebApp
 * @returns true, если приложение запущено в Telegram WebApp
 */
export function isTelegramWebApp(): boolean {
  return !!(window.Telegram && window.Telegram.WebApp);
}

/**
 * Инициализирует Telegram WebApp
 * Вызывает метод ready() для сообщения Telegram о готовности приложения
 */
export function initTelegramWebApp(): void {
  if (window.Telegram && window.Telegram.WebApp) {
    // Расширяем экран на всё доступное пространство
    window.Telegram.WebApp.expand();
    
    // Сообщаем о готовности приложения
    window.Telegram.WebApp.ready();
    
    console.log('Telegram WebApp инициализирован');
  } else {
    console.warn('Telegram WebApp API не доступен');
  }
}