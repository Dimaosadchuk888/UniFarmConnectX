/**
 * Специализированный модуль для проверки и обработки Telegram initData
 * Обеспечивает надежное извлечение данных пользователя и параметров запуска
 */

/**
 * Представляет данные пользователя из Telegram WebApp
 */
export interface TelegramInitData {
  // Данные пользователя
  userId?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  
  // Метаданные запуска
  startParam?: string;
  platform?: string;
  authDate?: string;
  
  // Реферальные данные
  refCode?: string;  // Извлеченный реферальный код из startParam
  
  // Полные данные для отладки
  rawInitData?: string;
  rawInitDataUnsafe?: any;
  
  // Флаги состояния
  isValid: boolean;
  validationErrors: string[];
}

/**
 * Проверяет и извлекает данные Telegram WebApp
 * Корректно обрабатывает различные форматы данных и ситуации частичной инициализации
 * @returns Структурированные данные из Telegram WebApp или ошибки проверки
 */
export function extractTelegramInitData(): TelegramInitData {
  // Результат по умолчанию
  const result: TelegramInitData = {
    isValid: false,
    validationErrors: []
  };
  
  // Проверка основных объектов
  if (typeof window === 'undefined') {
    result.validationErrors.push('window объект недоступен (SSR)');
    return result;
  }
  
  if (!window.Telegram) {
    result.validationErrors.push('Объект Telegram не найден в window');
    return result;
  }
  
  if (!window.Telegram.WebApp) {
    result.validationErrors.push('Объект Telegram.WebApp не инициализирован');
    return result;
  }
  
  // Добавляем все доступные данные, даже если некоторые поля отсутствуют
  const { WebApp } = window.Telegram;
  
  // Сохраняем raw данные для отладки
  result.rawInitData = WebApp.initData || undefined;
  result.rawInitDataUnsafe = WebApp.initDataUnsafe;
  
  // Проверка initData
  if (!WebApp.initData || WebApp.initData.trim() === '') {
    result.validationErrors.push('WebApp.initData отсутствует или пустой');
  }
  
  // Проверка initDataUnsafe
  if (!WebApp.initDataUnsafe) {
    result.validationErrors.push('WebApp.initDataUnsafe отсутствует');
  } else {
    // Проверка user
    if (!WebApp.initDataUnsafe.user) {
      result.validationErrors.push('WebApp.initDataUnsafe.user отсутствует');
    } else {
      // Извлечение информации о пользователе
      result.userId = WebApp.initDataUnsafe.user.id;
      result.username = WebApp.initDataUnsafe.user.username;
      result.firstName = WebApp.initDataUnsafe.user.first_name;
      result.lastName = WebApp.initDataUnsafe.user.last_name;
      result.photoUrl = WebApp.initDataUnsafe.user.photo_url;
      
      // Проверка на обязательный userId
      if (typeof result.userId !== 'number') {
        result.validationErrors.push('WebApp.initDataUnsafe.user.id не является числом');
      }
    }
    
    // Извлечение метаданных
    result.authDate = WebApp.initDataUnsafe.auth_date;
  }
  
  // Извлечение дополнительных полей
  result.startParam = WebApp.startParam;
  result.platform = WebApp.platform;
  
  // Пытаемся извлечь ref_code из startParam, если он имеет формат startapp=ref_CODE
  if (result.startParam) {
    if (result.startParam.startsWith('ref_')) {
      // Прямой формат ref_CODE
      result.refCode = result.startParam;
      console.log('[telegramInitData] Извлечен ref_code из startParam:', result.refCode);
    } else if (result.startParam.includes('=ref_')) {
      // Формат startapp=ref_CODE или другие параметры с ref_CODE
      const match = result.startParam.match(/=ref_([^&]+)/);
      if (match && match[1]) {
        result.refCode = `ref_${match[1]}`;
        console.log('[telegramInitData] Извлечен ref_code из сложного startParam:', result.refCode);
      }
    }
  }
  
  // Проверка метаданных
  if (!result.authDate) {
    result.validationErrors.push('auth_date отсутствует');
  }
  
  // Установка флага валидности
  result.isValid = result.validationErrors.length === 0 && typeof result.userId === 'number';
  
  // Подробный отчет в консоль для отладки
  console.log('[telegramInitData] Извлеченные данные:', {
    isValid: result.isValid,
    userId: result.userId || 'отсутствует',
    username: result.username || 'отсутствует',
    firstName: result.firstName || 'отсутствует',
    startParam: result.startParam || 'отсутствует',
    platform: result.platform || 'отсутствует',
    errors: result.validationErrors,
    rawDataLength: result.rawInitData ? result.rawInitData.length : 0,
    hasInitDataUnsafe: !!result.rawInitDataUnsafe,
    isInIframe: window !== window.parent
  });
  
  return result;
}

/**
 * Проверяет, запущено ли приложение в Telegram WebApp и есть ли корректный ID пользователя
 * Использует строгий режим проверки, требуя наличия userId
 * @returns true, если имеются корректные данные пользователя
 */
export function hasTelegramUserId(): boolean {
  const telegramData = extractTelegramInitData();
  return telegramData.isValid && typeof telegramData.userId === 'number' && telegramData.userId > 0;
}

/**
 * Извлекает Telegram User ID с проверкой валидности
 * @returns ID пользователя или null, если ID недоступен или некорректен
 */
export function getTelegramUserId(): number | null {
  const telegramData = extractTelegramInitData();
  
  if (telegramData.isValid && typeof telegramData.userId === 'number' && telegramData.userId > 0) {
    return telegramData.userId;
  }
  
  // Выводим причину недоступности ID
  console.warn('[telegramInitData] Telegram ID недоступен:', 
               telegramData.validationErrors.join('; '));
  
  return null;
}

/**
 * Извлекает startParam из Telegram WebApp
 * @returns startParam или null, если он недоступен
 */
export function getTelegramStartParam(): string | null {
  const telegramData = extractTelegramInitData();
  return telegramData.startParam || null;
}

/**
 * Извлекает реферальный код из startParam Telegram WebApp
 * @returns ref_code или null, если он недоступен
 */
export function getTelegramRefCode(): string | null {
  const telegramData = extractTelegramInitData();
  return telegramData.refCode || null;
}

/**
 * Проверяет запущено ли приложение в среде Telegram WebApp
 * В отличие от hasTelegramUserId(), проверяет только факт запуска в Telegram,
 * не требуя наличия конкретных данных пользователя
 */
export function isRunningInTelegram(): boolean {
  return !!(window?.Telegram?.WebApp);
}