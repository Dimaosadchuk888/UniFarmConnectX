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
  
  // Расширенное логирование состояния перед началом
  console.log('[telegramInitData] Начинаю извлечение данных Telegram:', {
    windowDefined: typeof window !== 'undefined',
    telegramAvailable: typeof window !== 'undefined' ? !!window.Telegram : false,
    webAppAvailable: typeof window !== 'undefined' && !!window.Telegram ? !!window.Telegram.WebApp : false,
    environment: typeof process !== 'undefined' ? process.env.NODE_ENV : 'unknown'
  });
  
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
  
  // Логирование формата initData
  console.log('[telegramInitData] Формат raw данных:', {
    initDataType: typeof WebApp.initData,
    initDataValue: WebApp.initData ? 
      (typeof WebApp.initData === 'string' ? 
        `${WebApp.initData.substring(0, 50)}...` : 
        'не является строкой') : 'отсутствует',
    initDataUnsafeType: typeof WebApp.initDataUnsafe,
    initDataUnsafeFormat: WebApp.initDataUnsafe ? 
      (WebApp.initDataUnsafe.user ? 'содержит user' : 'без user') : 
      'отсутствует'
  });
  
  // Сохраняем raw данные для отладки
  result.rawInitData = WebApp.initData || undefined;
  result.rawInitDataUnsafe = WebApp.initDataUnsafe;
  
  // Проверка initData с поддержкой разных форматов
  if (!WebApp.initData || (typeof WebApp.initData === 'string' && WebApp.initData.trim() === '')) {
    result.validationErrors.push('WebApp.initData отсутствует или пустой');
  }
  
  // Извлечение userId с поддержкой различных форматов данных
  let extractedUserId: number | string | undefined;
  
  // Проверка initDataUnsafe с более гибкой логикой
  if (!WebApp.initDataUnsafe) {
    result.validationErrors.push('WebApp.initDataUnsafe отсутствует');
  } else {
    // Проверка user с различными форматами
    if (!WebApp.initDataUnsafe.user) {
      // Попытка извлечь id напрямую из initDataUnsafe, если оно есть
      if (WebApp.initDataUnsafe.id) {
        extractedUserId = WebApp.initDataUnsafe.id;
        console.log('[telegramInitData] Нашел id напрямую в initDataUnsafe:', extractedUserId);
      } else {
        result.validationErrors.push('WebApp.initDataUnsafe.user отсутствует');
      }
    } else {
      // Извлечение информации о пользователе из стандартного user объекта
      extractedUserId = WebApp.initDataUnsafe.user.id;
      result.username = WebApp.initDataUnsafe.user.username;
      result.firstName = WebApp.initDataUnsafe.user.first_name;
      result.lastName = WebApp.initDataUnsafe.user.last_name;
      result.photoUrl = WebApp.initDataUnsafe.user.photo_url;
      
      console.log('[telegramInitData] Извлечены данные пользователя из user объекта:', {
        userId: extractedUserId,
        username: result.username || 'отсутствует',
        firstName: result.firstName || 'отсутствует'
      });
    }
    
    // Извлечение метаданных
    result.authDate = WebApp.initDataUnsafe.auth_date;
  }
  
  // Конвертация userId в числовой тип, если возможно
  if (extractedUserId !== undefined) {
    if (typeof extractedUserId === 'number') {
      result.userId = extractedUserId;
    } else if (typeof extractedUserId === 'string') {
      const numericUserId = Number(extractedUserId);
      // Проверяем, что конвертация прошла успешно (не NaN)
      if (!isNaN(numericUserId)) {
        result.userId = numericUserId;
        console.log('[telegramInitData] Конвертирован userId из строки в число:', numericUserId);
      } else {
        // Оставляем как строку, если конвертация не удалась
        // Всё равно присваиваем значение для последующей обработки
        result.userId = extractedUserId as any; // Используем any для обхода типизации
        console.log('[telegramInitData] Не удалось конвертировать userId в число, оставляю как строку:', extractedUserId);
      }
    }
  }
  
  // Извлечение дополнительных полей
  result.startParam = WebApp.startParam;
  result.platform = WebApp.platform;
  
  // Пытаемся извлечь ref_code из startParam с поддержкой разных форматов
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
  
  // Проверка метаданных - делаем более мягкой
  if (!result.authDate && !process.env.NODE_ENV?.includes('dev')) {
    // В production требуем auth_date, в development можно без него
    result.validationErrors.push('auth_date отсутствует (не критично в development)');
  }
  
  // Установка флага валидности с более гибкими правилами:
  // - Допускаем userId как number ИЛИ string
  // - В development не требуем всех проверок
  const userIdValid = (typeof result.userId === 'number' || typeof result.userId === 'string') && 
                      result.userId !== undefined && result.userId !== null;
                      
  // Соблюдаем ограничения: сохраняем структуру возвращаемого значения
  // В production режиме проверки строже, в development - мягче
  result.isValid = process.env.NODE_ENV === 'development' ? 
                    userIdValid :  // В dev режиме достаточно валидного userId
                    result.validationErrors.length === 0 && userIdValid; // В prod нужна полная валидность
  
  // Подробный отчет в консоль для отладки
  console.log('[telegramInitData] Итоговые данные:', {
    isValid: result.isValid,
    userIdType: typeof result.userId,
    userId: result.userId || 'отсутствует',
    username: result.username || 'отсутствует',
    firstName: result.firstName || 'отсутствует',
    startParam: result.startParam || 'отсутствует',
    platform: result.platform || 'отсутствует',
    errors: result.validationErrors,
    rawDataLength: result.rawInitData ? result.rawInitData.length : 0,
    hasInitDataUnsafe: !!result.rawInitDataUnsafe,
    isInIframe: window !== window.parent,
    isDev: process.env.NODE_ENV === 'development'
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