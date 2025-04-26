/**
 * Сервис для работы с гостевой идентификацией в приложении
 * Использует только guest_id и ref_code для идентификации пользователей (Этап 10.3)
 */

// Улучшенные типы для работы с Telegram WebApp API
declare global {
  interface Window {
    // Базовая поддержка хранилища
    localStorage?: Storage;
    sessionStorage?: Storage;
    
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
        MainButton?: {
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
        };
      };
    };
  }
}

// Ключ для хранения гостевого ID в localStorage
const GUEST_ID_KEY = 'unifarm_guest_id';
// Ключ для хранения реферального кода пользователя
const REF_CODE_KEY = 'unifarm_ref_code';
// Ключ для хранения времени последнего сохранения данных пользователя
const LAST_UPDATE_KEY = 'unifarm_last_update';
// Ключ для хранения данных инициализации Telegram в sessionStorage
const TELEGRAM_INIT_DATA_KEY = 'telegram_init_data';

// Типы ошибок при идентификации пользователя 
export enum IdentificationError {
  NOT_AVAILABLE = 'Идентификация пользователя недоступна',
  NO_GUEST_ID = 'Отсутствует guest_id',
  SESSION_EXPIRED = 'Сессия истекла'
}

/**
 * Представляет данные пользователя в системе
 */
export interface UserData {
  userId?: number;
  guestId?: string;
  refCode?: string;
  username?: string;
}

/**
 * Проверяет, запущено ли приложение в среде Telegram WebApp
 * Этап 11.1: Проверяем наличие Telegram WebApp или данных в sessionStorage
 * @returns true, если приложение запущено внутри Telegram, false в противном случае
 */
export function isTelegramWebApp(): boolean {
  // 1. Проверяем наличие Telegram WebApp API через глобальный объект
  const isTelegramAvailable = typeof window !== 'undefined' && !!window.Telegram;
  const isWebAppAvailable = isTelegramAvailable && !!window.Telegram?.WebApp;
  
  // 2. Проверяем наличие сохраненных данных в sessionStorage (от bridge-страницы)
  const hasTelegramInitData = typeof window !== 'undefined' && 
                            !!window.sessionStorage && 
                            !!window.sessionStorage.getItem(TELEGRAM_INIT_DATA_KEY);
  
  console.log('[telegramService] isTelegramWebApp check:', { 
    isTelegramAvailable, 
    isWebAppAvailable,
    hasTelegramInitData
  });
  
  // Возвращаем true, если доступен API или есть данные в sessionStorage
  return isWebAppAvailable || hasTelegramInitData;
}

/**
 * Инициализирует сервис идентификации пользователя
 * Этап 11.1: Минимальная инициализация Telegram WebApp для работы в среде Telegram
 * Вызывает только технические методы ready() и expand() без использования initData
 */
export function initTelegramWebApp(): boolean {
  // Проверяем наличие Telegram WebApp API
  const isTelegramAvailable = typeof window !== 'undefined' && !!window.Telegram;
  const isWebAppAvailable = isTelegramAvailable && !!window.Telegram?.WebApp;
  
  // Проверяем наличие сохраненных данных в sessionStorage (от bridge-страницы)
  const hasTelegramInitData = typeof window !== 'undefined' && 
    !!window.sessionStorage && 
    !!window.sessionStorage.getItem(TELEGRAM_INIT_DATA_KEY);
  
  console.log('[telegramService] Init check:', { 
    isTelegramAvailable, 
    isWebAppAvailable,
    hasTelegramInitData
  });
  
  // Если есть прямой доступ к Telegram WebApp API
  if (isWebAppAvailable && window.Telegram && window.Telegram.WebApp) {
    try {
      // Сообщаем Telegram, что приложение готово
      // @ts-ignore: мы уже проверили наличие объекта выше
      window.Telegram?.WebApp?.ready();
      console.log('[telegramService] WebApp.ready() called successfully');
      
      // Расширяем окно до максимальной высоты
      // @ts-ignore: мы уже проверили наличие объекта выше
      window.Telegram?.WebApp?.expand();
      console.log('[telegramService] WebApp.expand() called successfully');
      
      // Настраиваем базовый UI для лучшей интеграции
      // @ts-ignore: мы уже проверили наличие объекта выше
      if (window.Telegram?.WebApp?.MainButton) {
        // @ts-ignore: мы уже проверили наличие объекта выше
        window.Telegram?.WebApp?.MainButton?.hide();
      }
      
      // Возможно, у нас уже есть сохраненные initData из bridge - используем их
      // @ts-ignore: мы уже проверили наличие объекта выше
      if (window.sessionStorage && !window.Telegram?.WebApp?.initData && hasTelegramInitData) {
        const savedInitData = window.sessionStorage.getItem(TELEGRAM_INIT_DATA_KEY);
        console.log('[telegramService] Loaded initData from sessionStorage');
      }
      
      return true;
    } catch (error) {
      console.error('[telegramService] Error initializing Telegram WebApp:', error);
    }
  }
  
  // Если есть данные в sessionStorage, но нет доступа к Telegram WebApp API
  if (hasTelegramInitData) {
    console.log('[telegramService] Telegram WebApp API not available, but initData found in sessionStorage');
    try {
      const initData = window.sessionStorage.getItem(TELEGRAM_INIT_DATA_KEY);
      console.log('[telegramService] Using initData from sessionStorage:', 
        initData ? `${initData.substring(0, 50)}...` : 'null');
      return true;
    } catch (error) {
      console.error('[telegramService] Error loading initData from sessionStorage:', error);
    }
  }
  
  console.warn('[telegramService] Telegram WebApp API and initData not available');
  return false;
}

/**
 * Предоставляет диагностическую информацию о состоянии гостевой идентификации
 */
export function diagnosticTelegramWebApp(): Record<string, any> {
  // Проверяем наличие Telegram WebApp API
  const isTelegramAvailable = typeof window !== 'undefined' && !!window.Telegram;
  const isWebAppAvailable = isTelegramAvailable && !!window.Telegram?.WebApp;
  
  // Проверяем наличие initData из Telegram или в sessionStorage
  let initData = '';
  let initDataSource = 'none';
  let initDataLength = 0;
  
  if (isWebAppAvailable && window.Telegram?.WebApp?.initData) {
    initData = window.Telegram.WebApp.initData;
    initDataSource = 'telegram_webapp';
    initDataLength = initData.length;
  } else if (typeof window !== 'undefined' && window.sessionStorage) {
    const sessionInitData = window.sessionStorage.getItem(TELEGRAM_INIT_DATA_KEY);
    if (sessionInitData) {
      initData = sessionInitData;
      initDataSource = 'session_storage';
      initDataLength = initData.length;
    }
  }

  return {
    windowDefined: typeof window !== 'undefined',
    telegramExists: isTelegramAvailable,
    webAppExists: isWebAppAvailable,
    initDataExists: !!initData,
    initDataSource,
    initDataLength,
    initDataSample: initData ? `${initData.substring(0, 50)}...` : 'none',
    userExists: isWebAppAvailable && !!window.Telegram?.WebApp?.initDataUnsafe?.user,
    startParam: isWebAppAvailable ? window.Telegram?.WebApp?.initDataUnsafe?.start_param || null : null,
    developmentMode: process.env.NODE_ENV === 'development',
    isInIframe: window !== window.parent,
    userAgent: window?.navigator?.userAgent,
    referrer: document?.referrer
  };
}

/**
 * Получает данные пользователя (заглушка для совместимости)
 * @returns Промис с тестовыми данными в режиме разработки или ошибкой
 */
export function getTelegramUserData(): Promise<UserData> {
  return new Promise((resolve, reject) => {
    // В режиме разработки возвращаем тестовые данные
    if (process.env.NODE_ENV === 'development') {
      console.log('[telegramService] Using test data in development mode');
      resolve({
        userId: 1,
        guestId: 'test-guest-id',
        username: 'test_user'
      });
      return;
    }
    
    reject(new Error(IdentificationError.NOT_AVAILABLE));
  });
}

/**
 * Заглушка для совместимости
 * Этап 10.4: Удаление устаревших функций для работы с telegram_user_id
 * @returns Всегда null, так как не используем больше telegram_id
 */
export function getCachedTelegramUserId(): null {
  console.warn('[telegramService] getCachedTelegramUserId: функция устарела (Этап 10.4), возвращает null');
  return null;
}

/**
 * Очищает все кэшированные данные идентификации
 */
export function clearTelegramCache(): void {
  try {
    // Не удаляем guest_id и ref_code, так как они теперь основные
    console.log('[telegramService] Legacy Telegram cache cleared');
  } catch (error) {
    console.error('[telegramService] Error clearing cache:', error);
  }
}

/**
 * Запрашивает initData от Telegram WebApp API (заглушка для совместимости)
 * @returns {Promise<boolean>} Промис с результатом запроса
 */
export function requestInitData(): Promise<boolean> {
  return new Promise((resolve) => {
    console.log('[telegramService] requestInitData: функция устарела (Этап 10.5), всегда возвращает false');
    resolve(false);
  });
}

/**
 * Подготавливает заголовки для API запросов с гостевой идентификацией
 * @returns Объект с заголовками авторизации
 */
export function getTelegramAuthHeaders(): Record<string, string> {
  try {
    // В режиме разработки используем тестовые данные
    if (process.env.NODE_ENV === 'development') {
      console.log('[telegramService] [DEV] Using default test user ID: 1');
      return {
        'X-Development-Mode': 'true',
        'X-Development-User-Id': '1',
        'X-Telegram-User-Id': '1'
      };
    }
    
    // Проверяем наличие Telegram WebApp API
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      if (window.Telegram.WebApp.initData) {
        return {
          'Telegram-Init-Data': window.Telegram.WebApp.initData
        };
      }
    }
    
    // Проверяем наличие сохраненных данных в sessionStorage (от bridge-страницы)
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const initData = window.sessionStorage.getItem(TELEGRAM_INIT_DATA_KEY);
      if (initData) {
        return {
          'Telegram-Init-Data': initData
        };
      }
    }
    
    // В случае отсутствия данных возвращаем пустой объект
    console.warn('[telegramService] ⚠️ No Telegram initData available to add to headers');
    return {};
  } catch (error) {
    console.error('[telegramService] Error preparing auth headers:', error);
    return {};
  }
}

/**
 * Проверяет функциональность идентификации
 * @returns Объект с диагностической информацией
 */
export function checkTelegramWebApp(): Record<string, any> {
  try {
    // Базовая проверка наличия локального хранилища
    if (typeof window === 'undefined') {
      return { available: false, reason: 'Running in SSR' };
    }
    
    // Возвращаем информацию о guest_id
    const guestId = localStorage.getItem(GUEST_ID_KEY);
    const refCode = localStorage.getItem(REF_CODE_KEY);
    
    return {
      available: !!guestId,
      telegramAvailable: false,
      webAppAvailable: false,
      hasGuestId: !!guestId,
      guestId: guestId || 'not available',
      hasRefCode: !!refCode,
      refCode: refCode || 'not available',
      isInIframe: window !== window.parent,
      userAgent: window.navigator.userAgent,
      referrer: document.referrer
    };
  } catch (error) {
    console.error('[telegramService] Error checking identification:', error);
    return {
      available: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Регистрирует пользователя с данными идентификации
 * @param guestId Уникальный идентификатор гостя
 * @param referrerCode Реферальный код пригласившего (опционально)
 * @returns Promise с результатом регистрации
 */
export async function registerUserWithTelegram(guestId: string, referrerCode?: string): Promise<any> {
  try {
    console.log(`[telegramService] Registering user with guest_id: ${guestId}, referrerCode: ${referrerCode || 'none'}`);
    
    // Добавляем базовые данные регистрации
    const registrationData = {
      guest_id: guestId,
      ...(referrerCode ? { parent_ref_code: referrerCode } : {})
    };
    
    console.log('[telegramService] Registration data prepared:', registrationData);
    
    // Отправляем запрос на регистрацию
    const response = await fetch('/api/airdrop/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registrationData)
    });
    
    // Обработка ответа
    if (!response.ok) {
      throw new Error(`Registration failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log('[telegramService] Registration result:', result);
    
    return result;
  } catch (error) {
    console.error('[telegramService] Registration error:', error);
    throw error;
  }
}

/**
 * Логирует запуск Mini App и передает базовые метрики
 * @returns {Promise<boolean>} Результат логирования
 */
export async function logAppLaunch(): Promise<boolean> {
  try {
    // Проверяем наличие Telegram WebApp API
    const isTelegramAvailable = typeof window !== 'undefined' && !!window.Telegram;
    const isWebAppAvailable = isTelegramAvailable && !!window.Telegram?.WebApp;
    
    // Проверяем наличие initData в sessionStorage
    const hasTelegramInitData = typeof window !== 'undefined' && 
      !!window.sessionStorage && 
      !!window.sessionStorage.getItem(TELEGRAM_INIT_DATA_KEY);
    
    // Создаем объект с метаданными запуска
    const launchData: Record<string, any> = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      referrer: document.referrer || 'direct',
      userAgent: navigator.userAgent,
      isInIframe: window !== window.parent,
      telegramAvailable: isTelegramAvailable,
      webAppAvailable: isWebAppAvailable,
      hasInitData: isWebAppAvailable && !!window.Telegram?.WebApp?.initData,
      hasSessionInitData: hasTelegramInitData,
      platform: isWebAppAvailable ? window.Telegram?.WebApp?.platform || 'unknown' : 'unknown',
      webAppVersion: isWebAppAvailable ? window.Telegram?.WebApp?.version || 'unknown' : 'unknown'
    };
    
    // Получаем guest_id если он есть
    const guestId = localStorage.getItem(GUEST_ID_KEY);
    if (guestId) {
      launchData.guestId = guestId;
    }
    
    console.log('[telegramService] Logging Mini App launch...');
    
    // Отправляем запрос на логирование запуска
    try {
      const response = await fetch('/api/analytics/app-launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(launchData)
      });
      
      if (response.ok) {
        console.log('[telegramService] App launch logged successfully');
        return true;
      } else {
        console.warn('[telegramService] Failed to log app launch:', response.status, response.statusText);
        return false;
      }
    } catch (requestError) {
      console.error('[telegramService] Error sending app launch log:', requestError);
      return false;
    }
  } catch (error) {
    console.error('[telegramService] Error logging app launch:', error);
    return false;
  }
}

/**
 * Получает ID пользователя из нескольких источников с приоритетами
 * (заглушка для совместимости)
 * @param defaultValue Значение по умолчанию, если ID не удалось получить
 * @returns ID пользователя или defaultValue
 */
export function getTelegramId(defaultValue: number | null = null): number | null {
  try {
    // В режиме разработки возвращаем тестовый ID
    if (process.env.NODE_ENV === 'development') {
      console.log('[telegramService] [DEV] Using default test user ID: 1');
      return 1;
    }
    
    // Если не в режиме разработки, возвращаем defaultValue
    console.log(`[telegramService] Using default ID: ${defaultValue}`);
    return defaultValue;
  } catch (error) {
    console.error('[telegramService] Error getting ID:', error);
    return defaultValue;
  }
}

/**
 * Возвращает отображаемое имя пользователя Telegram для приветствия
 * Этап 10.3: Используем заглушку вместо данных из Telegram WebApp
 * @returns {string} Отображаемое имя пользователя или 'Уважаемый пользователь'
 */
export function getTelegramUserDisplayName(): string {
  try {
    if (process.env.NODE_ENV === 'development') {
      return 'Тестовый пользователь';
    }
    
    return 'Уважаемый пользователь';
  } catch (error) {
    console.error('[telegramService] Error getting user display name:', error);
    return 'Уважаемый пользователь';
  }
}