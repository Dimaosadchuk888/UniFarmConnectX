/**
 * Сервис для работы с Telegram Mini App
 * Обязательная идентификация через Telegram WebApp API
 */

import apiConfig from "@/config/apiConfig";

// Типы для работы с Telegram WebApp API
declare global {
  interface Window {
    // Базовая поддержка хранилища
    localStorage?: Storage;

    // Поддержка Telegram WebApp API
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
          start_param?: string;
        };
        version: string;
        platform: string;
        colorScheme?: string;
        viewportHeight?: number;
        viewportStableHeight?: number;
        themeParams?: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        onEvent?: (eventType: string, eventHandler: () => void) => void;
        offEvent?: (eventType: string, eventHandler: () => void) => void;
        isExpanded?: boolean;
        sendData?: (data: string) => void;
        showAlert?: (message: string) => void;
        MainButton?: {
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
        };
        BackButton?: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
        CloudStorage?: {
          setItem: (key: string, value: string) => Promise<void>;
          getItem: (key: string) => Promise<string>;
          getItems: (keys: string[]) => Promise<Record<string, string>>;
          removeItem: (key: string) => Promise<void>;
          removeItems: (keys: string[]) => Promise<void>;
          getKeys: () => Promise<string[]>;
        };
      };
    };
  }
}

// Типы ошибок при идентификации пользователя 
export enum IdentificationError {
  NOT_AVAILABLE = 'Telegram идентификация недоступна',
  NO_TELEGRAM_DATA = 'Отсутствуют данные Telegram',
  NO_INIT_DATA = 'Отсутствует initData',
  INVALID_USER = 'Недействительный пользователь Telegram'
}

/**
 * Представляет данные пользователя в системе
 */
export interface TelegramUserData {
  userId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  initData: string;
  startParam?: string;
}

/**
 * Проверяет, запущено ли приложение в среде Telegram WebApp
 * @returns true, если приложение запущено внутри Telegram, false в противном случае
 */
export function isTelegramWebApp(): boolean {
  try {
    // Проверяем наличие Telegram WebApp API через глобальный объект
    const isTelegramAvailable = typeof window !== 'undefined' && !!window.Telegram;
    const isWebAppAvailable = isTelegramAvailable && !!window.Telegram?.WebApp;

    console.log('[telegramService] isTelegramWebApp check:', { 
      isTelegramAvailable, 
      isWebAppAvailable,
      version: isWebAppAvailable ? window.Telegram?.WebApp?.version : 'недоступно',
      platform: isWebAppAvailable ? window.Telegram?.WebApp?.platform : 'недоступно',
      userAgent: navigator.userAgent,
      isInIframe: window.self !== window.top
    });

    return isWebAppAvailable;
  } catch (error) {
    console.error('[telegramService] Ошибка при проверке Telegram WebApp:', error);
    return false;
  }
}

/**
 * Инициализирует Telegram WebApp
 * @throws {Error} Если Telegram WebApp недоступен
 */
export function initTelegramWebApp(): boolean {
  if (!isTelegramWebApp()) {
    throw new Error('Приложение должно быть запущено в Telegram Mini App');
  }

  try {
    const webApp = window.Telegram!.WebApp!;

    // Сообщаем Telegram, что приложение готово
    webApp.ready();
    console.log('[TG INIT] ✅ WebApp.ready() called successfully');

    // Расширяем окно до максимальной высоты
    webApp.expand();
    console.log('[TG EXPAND]');

    // Проверяем наличие initData
    const initData = webApp.initData;
    const initDataUnsafe = webApp.initDataUnsafe;

    console.log('[TG INIT] Диагностика данных:', {
      hasInitData: !!initData,
      initDataLength: initData?.length || 0,
      hasUser: !!initDataUnsafe?.user,
      userId: initDataUnsafe?.user?.id,
      startParam: initDataUnsafe?.start_param,
      platform: webApp.platform,
      version: webApp.version
    });

    // Проверяем обязательные данные
    if (!initData || initData.length === 0) {
      throw new Error('Отсутствует initData - приложение должно быть запущено через Telegram');
    }

    if (!initDataUnsafe?.user?.id) {
      throw new Error('Отсутствуют данные пользователя Telegram');
    }

    // Настраиваем UI
    if (webApp.MainButton) {
      webApp.MainButton.hide();
    }

    localStorage.setItem('tg_ready', 'true');
    console.log('[TG INIT: DONE]');

    return true;
  } catch (error) {
    console.error('[TG INIT ERROR]', error);
    throw error;
  }
}

/**
 * Получает данные пользователя из Telegram WebApp
 * @returns Промис с данными пользователя Telegram
 * @throws {Error} Если данные недоступны
 */
export function getTelegramUserData(): Promise<TelegramUserData> {
  return new Promise((resolve, reject) => {
    try {
      if (!isTelegramWebApp()) {
        reject(new Error(IdentificationError.NOT_AVAILABLE));
        return;
      }

      const webApp = window.Telegram!.WebApp!;
      const initData = webApp.initData;
      const userData = webApp.initDataUnsafe?.user;

      if (!initData || initData.length === 0) {
        reject(new Error(IdentificationError.NO_INIT_DATA));
        return;
      }

      if (!userData?.id) {
        reject(new Error(IdentificationError.INVALID_USER));
        return;
      }

      const telegramUserData: TelegramUserData = {
        userId: userData.id,
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        initData: initData,
        startParam: webApp.initDataUnsafe?.start_param
      };

      console.log('[TG DATA] Получены данные Telegram пользователя:', telegramUserData);
      resolve(telegramUserData);
    } catch (error) {
      console.error('[telegramService] Ошибка при получении данных Telegram:', error);
      reject(error);
    }
  });
}

/**
 * Подготавливает заголовки для API запросов с Telegram данными
 * @returns Объект с заголовками авторизации
 * @throws {Error} Если Telegram данные недоступны
 */
export function getTelegramAuthHeaders(): Record<string, string> {
  try {
    if (!isTelegramWebApp()) {
      throw new Error('Telegram WebApp недоступен');
    }

    const webApp = window.Telegram!.WebApp!;
    const initData = webApp.initData;
    const user = webApp.initDataUnsafe?.user;

    if (!initData || initData.length === 0) {
      throw new Error('Отсутствует initData');
    }

    if (!user?.id) {
      throw new Error('Отсутствуют данные пользователя');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Version': '1.0.0',
      'Telegram-Init-Data': initData,
      'X-Telegram-User-Id': String(user.id)
    };

    console.log('[telegramService] Подготовлены заголовки для авторизованного пользователя:', {
      hasInitData: true,
      userId: user.id,
      username: user.username
    });

    return headers;
  } catch (error) {
    console.error('[telegramService] Ошибка подготовки заголовков:', error);
    throw error;
  }
}

/**
 * Возвращает отображаемое имя пользователя Telegram
 * @returns Имя пользователя
 */
export function getTelegramUserDisplayName(): string {
  try {
    if (typeof window !== 'undefined' && 
        window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const user = window.Telegram.WebApp.initDataUnsafe.user;

      if (user.first_name) {
        if (user.last_name) {
          return `${user.first_name} ${user.last_name}`;
        }
        return user.first_name;
      }

      if (user.username) {
        return user.username;
      }
    }

    return 'Пользователь Telegram';
  } catch (error) {
    console.error('[telegramService] Error getting username:', error);
    return 'Пользователь Telegram';
  }
}

/**
 * Проверяет доступность Telegram
 * @returns Объект с диагностической информацией
 */
export function checkTelegramWebApp(): Record<string, any> {
  try {
    if (typeof window === 'undefined') {
      return { available: false, reason: 'Running in SSR' };
    }

    const isTelegramAvailable = isTelegramWebApp();
    const hasInitData = isTelegramAvailable && !!window.Telegram?.WebApp?.initData;
    const hasUser = isTelegramAvailable && !!window.Telegram?.WebApp?.initDataUnsafe?.user;

    return {
      available: isTelegramAvailable && hasInitData && hasUser,
      telegramAvailable: isTelegramAvailable,
      hasInitData,
      hasUser,
      isInIframe: window !== window.parent,
      userAgent: window.navigator.userAgent,
      referrer: document.referrer
    };
  } catch (error) {
    console.error('[telegramService] Error checking Telegram:', error);
    return {
      available: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Регистрирует пользователя через Telegram
 * @param referrerCode Реферальный код, если есть
 * @returns Promise с результатом регистрации
 */
export async function registerTelegramUser(telegramId: number, userData: any, refCode?: string): Promise<any> {
  try {
    console.log('[telegramService] Регистрация пользователя через Telegram...');

    // Валидируем обязательные данные Telegram
    if (!telegramId || !userData.first_name) {
      throw new Error('Отсутствуют обязательные данные Telegram');
    }

    // // Получаем initData
    // const initData = getInitData();
    // if (!initData) {
    //   throw new Error('Отсутствует initData - доступ только через Telegram Mini App');
    // }
    const webApp = window.Telegram!.WebApp!;
    const initData = webApp.initData;

    // Формируем данные для регистрации
    const registerData = {
      telegram_id: telegramId,
      username: userData.username,
      first_name: userData.first_name,
      last_name: userData.last_name,
      initData: initData,
      parent_ref_code: refCode
    };

    console.log('[telegramService] Отправка данных для регистрации:', {
      telegram_id: telegramId,
      username: userData.username,
      first_name: userData.first_name,
      has_initData: !!initData,
      parent_ref_code: refCode || 'отсутствует'
    });

    const response = await fetch(`${apiConfig.baseUrl}/api/register/telegram`, {
      method: 'POST',
      headers: getTelegramAuthHeaders(),
      body: JSON.stringify(registerData)
    });

    console.log('[TELEGRAM REGISTER] Ответ сервера:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка регистрации: ${response.status} - ${errorText}`);
    }

    const registrationResult = await response.json();
    console.log('[TELEGRAM REGISTER] ✅ Успешная регистрация:', registrationResult);

    return registrationResult;
  } catch (error) {
    console.error('[telegramService] Ошибка регистрации пользователя:', error);
    throw error;
  }
}

/**
 * Логирует запуск Mini App
 */
export async function logAppLaunch(): Promise<boolean> {
  try {
    const telegramData = await getTelegramUserData();

    const logData = {
      client_timestamp: new Date().toISOString(),
      telegram_user_id: telegramData.userId,
      platform: window.Telegram?.WebApp?.platform || 'unknown',
      user_agent: navigator.userAgent
    };

    const response = await fetch(`${apiConfig.baseUrl}/api/analytics/app-launch`, {
      method: 'POST',
      headers: getTelegramAuthHeaders(),
      body: JSON.stringify(logData)
    });

    if (!response.ok) {
      throw new Error(`Ошибка логирования: ${response.status}`);
    }

    console.log('[telegramService] App launch logged successfully');
    return true;
  } catch (error) {
    console.error('[telegramService] Error logging app launch:', error);
    return false;
  }
}

export const getApiHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache'
  };

  try {
    // Получаем initData
    const webApp = window.Telegram!.WebApp!;
    const initData = webApp.initData;
    if (initData && initData.length > 0) {
      headers['X-Telegram-Init-Data'] = initData;
    }

    // Получаем данные пользователя Telegram
    const telegramUser = window.Telegram!.WebApp!.initDataUnsafe?.user;
    if (telegramUser && telegramUser.id) {
      headers['X-Telegram-User-ID'] = telegramUser.id.toString();
    }

    // В режиме разработки добавляем заголовок
    if (process.env.NODE_ENV === 'development') {
      headers['X-Development-Mode'] = 'true';
    }

    console.log('[telegramService] Подготовка заголовков:', {
      hasInitData: !!initData,
      initDataLength: initData?.length || 0,
      hasUser: !!telegramUser,
      telegramUserId: telegramUser?.id || 'отсутствует'
    });

    return headers;
  } catch (error) {
    console.error('[telegramService] Ошибка при формировании заголовков:', error);
    return headers;
  }
};