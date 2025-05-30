/**
 * Сервис для работы с гостевой идентификацией в приложении
 * Использует только guest_id и ref_code для идентификации пользователей (Этап 10.3)
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
        // ЭТАП 1: Добавление themeParams для динамической темы
        themeParams?: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        // ЭТАП 1: Добавление обработчиков событий
        onEvent?: (eventType: string, eventHandler: () => void) => void;
        offEvent?: (eventType: string, eventHandler: () => void) => void;
        // ЭТАП 1: Добавление свойства isExpanded
        isExpanded?: boolean;
        // ЭТАП 3: Добавление sendData для отправки данных в бот
        sendData?: (data: string) => void;
        // ЭТАП 3: Добавление showAlert для показа уведомлений
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

// Ключ для хранения гостевого ID в localStorage
const GUEST_ID_KEY = 'unifarm_guest_id';
// Ключ для хранения реферального кода пользователя
const REF_CODE_KEY = 'unifarm_ref_code';
// Ключ для хранения времени последнего сохранения данных пользователя
const LAST_UPDATE_KEY = 'unifarm_last_update';

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
 * @returns true, если приложение запущено внутри Telegram, false в противном случае
 */
export function isTelegramWebApp(): boolean {
  try {
    // Проверяем наличие Telegram WebApp API через глобальный объект
    const isTelegramAvailable = typeof window !== 'undefined' && !!window.Telegram;
    const isWebAppAvailable = isTelegramAvailable && !!window.Telegram?.WebApp;
    
    // Детальное логирование
    console.log('[telegramService] isTelegramWebApp check:', { 
      isTelegramAvailable, 
      isWebAppAvailable,
      // Более подробная информация, если API доступен
      version: isWebAppAvailable ? window.Telegram?.WebApp?.version : 'недоступно',
      platform: isWebAppAvailable ? window.Telegram?.WebApp?.platform : 'недоступно',
      userAgent: navigator.userAgent,
      isInIframe: window.self !== window.top
    });
    
    // Возвращаем true только если доступен официальный Telegram WebApp API
    return isWebAppAvailable;
  } catch (error) {
    console.error('[telegramService] Ошибка при проверке Telegram WebApp:', error);
    return false;
  }
}

/**
 * Инициализирует сервис идентификации пользователя
 * Минимальная инициализация Telegram WebApp для работы в среде Telegram
 * Включает интеграцию с темой и событиями Telegram WebApp
 */
export function initTelegramWebApp(): boolean {
  // Проверяем наличие Telegram WebApp API
  const isTelegramAvailable = typeof window !== 'undefined' && !!window.Telegram;
  const isWebAppAvailable = isTelegramAvailable && !!window.Telegram?.WebApp;
  
  console.log('[telegramService] Init check:', { 
    isTelegramAvailable, 
    isWebAppAvailable,
    userAgent: navigator.userAgent,
    isInTelegram: navigator.userAgent.includes('Telegram')
  });
  
  // Инициализация только при наличии официального Telegram WebApp API
  if (isWebAppAvailable && window.Telegram && window.Telegram.WebApp) {
    try {
      // Сообщаем Telegram, что приложение готово
      window.Telegram.WebApp.ready();
      console.log('[TG INIT] ✅ WebApp.ready() called successfully');
      
      // Расширяем окно до максимальной высоты
      window.Telegram.WebApp.expand();
      console.log('[TG EXPAND]');
      
      // Диагностика initData
      const initData = window.Telegram.WebApp.initData;
      const initDataUnsafe = window.Telegram.WebApp.initDataUnsafe;
      
      console.log('[TG INIT] Диагностика данных:', {
        hasInitData: !!initData,
        initDataLength: initData?.length || 0,
        hasUser: !!initDataUnsafe?.user,
        userId: initDataUnsafe?.user?.id,
        startParam: initDataUnsafe?.start_param,
        platform: window.Telegram.WebApp.platform,
        version: window.Telegram.WebApp.version
      });
      
      // Если initData отсутствует, выводим предупреждение
      if (!initData || initData.length === 0) {
        console.warn('[TG INIT] ⚠️ ВНИМАНИЕ: initData пустой! Возможные причины:');
        console.warn('[TG INIT] 1. Приложение открыто не через Telegram');
        console.warn('[TG INIT] 2. Неправильно настроен бот или webhook');
        console.warn('[TG INIT] 3. Используется режим разработки');
      }
      
      // НОВАЯ ФУНКЦИОНАЛЬНОСТЬ: Инициализация темы Telegram
      // Интегрируем систему управления темой для автоматической адаптации
      try {
        // Динамический импорт службы темы для избежания циклических зависимостей
        import('./telegramThemeService').then(({ initFullTelegramThemeIntegration }) => {
          const themeInitSuccess = initFullTelegramThemeIntegration();
          console.log('[TG THEME INTEGRATION]', themeInitSuccess ? 'успешно' : 'с ошибками');
        }).catch(error => {
          console.warn('[TG THEME INTEGRATION] Ошибка загрузки:', error);
        });
      } catch (error) {
        console.warn('[TG THEME INTEGRATION] Ошибка инициализации:', error);
      }
      
      // Настраиваем базовый UI для лучшей интеграции
      if (window.Telegram.WebApp.MainButton) {
        window.Telegram.WebApp.MainButton.hide();
      }
      
      // Обработка initData для получения пользовательских данных
      try {
        const initData = window.Telegram.WebApp.initDataUnsafe;
        console.log('[TG INIT DATA]', initData);
        
        if (initData && initData.user && initData.user.id) {
          console.log('[TG USER ID]', initData.user.id);
        } else {
          console.warn('[TG INIT] ⚠️ initData.user.id отсутствует - пользователь не авторизован через Telegram');
        }
      } catch (error) {
        console.warn('[TG INIT] ⚠️ Ошибка при обработке initData:', error);
      }
      
      // Унифицированное состояние готовности
      localStorage.setItem('tg_ready', 'true');
      console.log('[TG INIT: DONE]');
      
      return true;
    } catch (error) {
      console.error('[TG INIT ERROR]', error);
      return false;
    }
  }
  
  console.warn('[TG INIT ERROR] Telegram WebApp API not available');
  return false;
}

/**
 * Предоставляет диагностическую информацию о состоянии гостевой идентификации
 */
export function diagnosticTelegramWebApp(): Record<string, any> {
  // Проверяем наличие Telegram WebApp API
  const isTelegramAvailable = typeof window !== 'undefined' && !!window.Telegram;
  const isWebAppAvailable = isTelegramAvailable && !!window.Telegram?.WebApp;
  
  // Проверяем наличие initData непосредственно из Telegram WebApp API
  let initData = '';
  let initDataSource = 'none';
  let initDataLength = 0;
  
  if (isWebAppAvailable && window.Telegram?.WebApp?.initData) {
    initData = window.Telegram.WebApp.initData;
    initDataSource = 'telegram_webapp';
    initDataLength = initData.length;
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
 * Получает данные пользователя из Telegram WebApp
 * @returns Промис с данными пользователя Telegram или null если недоступно
 */
export function getTelegramUserData(): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      // Проверяем наличие Telegram WebApp API
      if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
        console.warn('[telegramService] ⚠️ Telegram WebApp API недоступен');
        resolve(null);
        return;
      }

      // Получаем initData и пользователя из Telegram
      const initData = window.Telegram.WebApp.initData;
      const userData = window.Telegram.WebApp.initDataUnsafe?.user;
      
      // Дополнительная проверка на валидность initData
      if (!initData || initData.length === 0) {
        console.warn('[telegramService] ⚠️ initData пустой или отсутствует');
        console.log('[telegramService] Детали среды:', {
          platform: window.Telegram.WebApp.platform,
          version: window.Telegram.WebApp.version,
          isInIframe: window.self !== window.top,
          userAgent: navigator.userAgent
        });
        resolve(null);
        return;
      }

      console.log('[telegramService] Telegram данные:', {
        hasInitData: !!initData,
        initDataLength: initData?.length || 0,
        hasUser: !!userData,
        userId: userData?.id,
        username: userData?.username,
        firstName: userData?.first_name
      });

      if (userData?.id) {
        // Возвращаем реальные данные пользователя Telegram
        const telegramUserData = {
          id: userData.id,
          username: userData.username,
          first_name: userData.first_name,
          last_name: userData.last_name,
          language_code: userData.language_code || 'en',
          initData: initData
        };
        
        console.log('[TG DATA] Получены реальные данные Telegram пользователя:', telegramUserData);
        resolve(telegramUserData);
      } else {
        console.log('[telegramService] Данные Telegram пользователя недоступны');
        resolve(null);
      }
    } catch (error) {
      console.error('[telegramService] Ошибка при получении данных Telegram:', error);
      resolve(null);
    }
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
    // Базовые заголовки для всех запросов
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Version': '1.0.0'
    };
    
    // В режиме разработки используем тестовые данные
    if (process.env.NODE_ENV === 'development') {
      console.log('[telegramService] [DEV] Using default test user ID: 1');
      return {
        ...baseHeaders,
        'X-Development-Mode': 'true',
        'X-Development-User-Id': '1',
        'X-Telegram-User-Id': '1'
      };
    }
    
    // Проверяем наличие Telegram WebApp API и добавляем initData в заголовки
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const initData = window.Telegram.WebApp.initData;
      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      
      console.log('[telegramService] Подготовка заголовков:', {
        hasInitData: !!initData,
        initDataLength: initData?.length || 0,
        hasUser: !!user,
        userId: user?.id
      });
      
      if (initData && initData.length > 0) {
        const headers: Record<string, string> = {
          ...baseHeaders,
          'Telegram-Init-Data': initData
        };
        
        // Добавляем дополнительные заголовки если есть пользователь
        if (user?.id) {
          headers['X-Telegram-User-Id'] = String(user.id);
        }
        
        return headers;
      }
      
      // Если initData пустой, но есть пользователь, используем fallback
      if (user?.id) {
        console.warn('[telegramService] ⚠️ initData пустой, используем fallback с user ID');
        return {
          ...baseHeaders,
          'X-Telegram-User-Id': String(user.id),
          'X-Fallback-Mode': 'true'
        };
      }
    }
    
    // В случае отсутствия данных Telegram работаем в guest режиме
    console.log('[telegramService] Работаем в guest режиме без Telegram данных');
    return {
      ...baseHeaders,
      'X-Guest-Mode': 'true'
    };
  } catch (error) {
    console.error('[telegramService] Error preparing auth headers:', error);
    return {
      'Content-Type': 'application/json',
      'X-Error-Mode': 'true'
    };
  }
}

/**
 * Возвращает отображаемое имя пользователя Telegram
 * @returns Имя пользователя или дефолтное значение
 */
export function getTelegramUserDisplayName(): string {
  try {
    // Проверяем наличие WebApp API
    if (typeof window !== 'undefined' && 
        window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const user = window.Telegram.WebApp.initDataUnsafe.user;
      
      // Формируем имя из доступных полей
      if (user.first_name) {
        if (user.last_name) {
          return `${user.first_name} ${user.last_name}`;
        }
        return user.first_name;
      }
      
      // Если есть только username
      if (user.username) {
        return user.username;
      }
    }
    
    // Если работаем в режиме разработки
    if (process.env.NODE_ENV === 'development') {
      return 'Тестовый Пользователь';
    }
    
    // В случае отсутствия данных возвращаем дефолтное значение
    return 'Пользователь';
  } catch (error) {
    console.error('[telegramService] Error getting username:', error);
    return 'Пользователь';
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
    
    // Проверяем наличие Telegram WebApp API
    const isTelegramAvailable = typeof window !== 'undefined' && !!window.Telegram;
    const isWebAppAvailable = isTelegramAvailable && !!window.Telegram?.WebApp;
    
    return {
      available: !!guestId,
      telegramAvailable: isTelegramAvailable,
      webAppAvailable: isWebAppAvailable,
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
/**
 * Регистрирует пользователя на основе guest_id, полностью независимо от Telegram-данных
 * Это позволяет использовать приложение с разных Telegram-аккаунтов на одном устройстве
 * @param guestId Уникальный идентификатор гостя
 * @param referrerCode Реферальный код, если есть
 */
export async function registerUserWithTelegram(
  guestId: string,
  referrerCode?: string
): Promise<any> {
  try {
    console.log(`[REGISTER] Начало регистрации: guestId=${guestId}, referrerCode=${referrerCode || 'отсутствует'}`);
    
    // [TG REGISTRATION FIX] Получаем данные Telegram пользователя
    const telegramData = await getTelegramUserData();
    
    if (telegramData?.id) {
      // Регистрация через telegram_id
      console.log(`[TG REGISTERED] Регистрация Telegram пользователя: telegram_id=${telegramData.id}, username=${telegramData.username || 'N/A'}`);
      
      const registerData: any = {
        telegram_id: telegramData.id,
        username: telegramData.username || undefined,
        first_name: telegramData.first_name || undefined,
        last_name: telegramData.last_name || undefined,
        language_code: telegramData.language_code || 'en',
        guest_id: guestId // Добавляем guest_id для связки
      };
      
      // Добавляем реферальный код, если он предоставлен
      if (referrerCode) {
        registerData.parent_ref_code = referrerCode;
        console.log(`[TG REGISTERED] С реферальным кодом: ${referrerCode}`);
      }
      
      // Отправляем запрос на регистрацию через Telegram
      console.log(`[TELEGRAM REGISTER] Отправляем данные на /api/register/telegram:`, registerData);
      
      const response = await fetch(`${apiConfig.baseUrl}/api/register/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTelegramAuthHeaders()
        },
        body: JSON.stringify(registerData)
      });
      
      console.log(`[TELEGRAM REGISTER] Получен ответ от сервера: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        // Если Telegram регистрация не удалась, fallback к guest регистрации
        console.warn(`[TELEGRAM REGISTER] Telegram регистрация не удалась, переход к guest регистрации`);
        throw new Error('Telegram registration failed, falling back to guest');
      }
      
      const registrationResult = await response.json();
      console.log(`[TELEGRAM REGISTER] ✅ Успешная регистрация:`, {
        success: registrationResult.success,
        userId: registrationResult.user?.id,
        username: registrationResult.user?.username,
        telegramId: registrationResult.user?.telegram_id,
        refCode: registrationResult.user?.ref_code
      });
      
      return registrationResult;
    } else {
      throw new Error('No Telegram data available, using guest registration');
    }
  } catch (error) {
    // Fallback: регистрация через guest_id
    console.log(`[telegramService] ⚠️ Fallback к guest_id регистрации: ${guestId}, рефкод: ${referrerCode || 'отсутствует'}`);
    
    try {
      const registerData: any = {
        guest_id: guestId,
        username: `guest_${guestId.substring(0, 8)}`
      };
      
      if (referrerCode) {
        registerData.parent_ref_code = referrerCode;
      }
      
      console.log(`[GUEST REGISTER] Отправляем запрос на /api/register/guest:`, registerData);
      
      const response = await fetch(`${apiConfig.baseUrl}/api/register/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTelegramAuthHeaders()
        },
        body: JSON.stringify(registerData)
      });
      
      console.log(`[GUEST REGISTER] Получен ответ от сервера: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GUEST REGISTER] Ошибка регистрации: ${response.status} - ${errorText}`);
        throw new Error(`Ошибка регистрации guest пользователя: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const registrationResult = await response.json();
      console.log(`[GUEST REGISTER] ✅ Успешная guest регистрация:`, registrationResult);
      
      return registrationResult;
    } catch (guestError) {
      console.error(`[telegramService] Критическая ошибка - не удалось зарегистрировать пользователя:`, guestError);
      
      return {
        success: false,
        error: guestError instanceof Error ? guestError.message : String(guestError),
        fallbackMode: true
      };
    }
  }
}

/**
 * Логирует запуск Mini App в аналитику
 * @returns {Promise<boolean>} Промис с результатом запроса
 */
export async function logAppLaunch(): Promise<boolean> {
  try {
    // Собираем диагностическую информацию о среде
    const environment = diagnosticTelegramWebApp();
    
    // Упрощенное тело запроса с основной информацией
    const logData = {
      client_timestamp: new Date().toISOString(),
      is_telegram_app: environment.webAppExists,
      platform: environment.telegramExists && environment.webAppExists ? 
                window.Telegram?.WebApp?.platform || 'unknown' : 
                'browser',
      user_agent: navigator.userAgent
    };
    
    // Отправляем логгирующий запрос в аналитику
    const response = await fetch(`${apiConfig.baseUrl}/api/analytics/app-launch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getTelegramAuthHeaders() // Добавляем заголовки авторизации
      },
      body: JSON.stringify(logData)
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка логирования запуска: ${response.status} ${response.statusText}`);
    }
    
    console.log('[telegramService] App launch logged successfully');
    return true;
  } catch (error) {
    console.error('[telegramService] Error logging app launch:', error);
    return false;
  }
}