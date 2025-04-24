import { createHash, createHmac } from 'crypto';

/**
 * Результат валидации Telegram initData
 */
export interface TelegramValidationResult {
  isValid: boolean;
  userId: number | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  startParam?: string | null;
  authDate?: number | null;
  rawInitData?: string;
  validationErrors?: string[];
}

/**
 * Объект с настройками валидации
 */
interface TelegramValidationOptions {
  /** Максимальное время в секундах, в течение которого initData считается действительным */
  maxAgeSeconds?: number;
  /** Режим разработки (пропускает некоторые проверки) */
  isDevelopment?: boolean;
  /** Требовать ли наличие userId (в разработке можно отключить) */
  requireUserId?: boolean;
  /** Разрешать ли использование fallback ID=1 */
  allowFallbackId?: boolean;
}

/**
 * Проверяет и разбирает initData из Telegram WebApp
 * 
 * @param initData Строка initData из Telegram WebApp
 * @param botToken Токен Telegram бота для проверки подписи
 * @param options Настройки валидации
 * @returns Результат валидации
 */
export function validateTelegramInitData(
  initData: string | null | undefined,
  botToken: string | null | undefined,
  options: TelegramValidationOptions = {}
): TelegramValidationResult {
  const {
    maxAgeSeconds = 86400, // 24 часа по умолчанию
    isDevelopment = process.env.NODE_ENV !== 'production',
    requireUserId = !isDevelopment, // В режиме разработки не требуем userId
    allowFallbackId = isDevelopment, // В продакшене запрещаем ID=1
  } = options;

  const errors: string[] = [];
  let isValid = true; // Изначально считаем данные валидными

  // Проверка наличия данных
  if (!initData) {
    errors.push('Отсутствуют данные initData');
    isValid = false;
    return { isValid: false, userId: null, validationErrors: errors };
  }

  // Парсим параметры из initData
  const params = new URLSearchParams(initData);

  // Проверяем наличие хеша подписи
  const hash = params.get('hash');
  if (!hash) {
    errors.push('Отсутствует hash в данных инициализации');
    isValid = false;
  }

  // Проверяем наличие метки времени
  const authDateStr = params.get('auth_date');
  let authDate: number | null = null;
  if (!authDateStr) {
    errors.push('Отсутствует auth_date в данных инициализации');
    isValid = false;
  } else {
    authDate = parseInt(authDateStr);
    if (isNaN(authDate)) {
      errors.push('Некорректный формат auth_date');
      isValid = false;
    } else {
      // Проверяем актуальность данных (не устарели ли они)
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime - authDate > maxAgeSeconds) {
        errors.push(`Данные устарели (максимальный возраст: ${maxAgeSeconds} секунд)`);
        isValid = false;
      }
    }
  }

  // Извлечение параметра start (для реферальной системы)
  // Пункт 2.2 ТЗ: Улучшенное извлечение startParam для поддержки реферальных ссылок
  const startParam = params.get('start_param') || params.get('startParam') || params.get('tgWebAppStartParam');

  // Извлечение данных пользователя
  let userId: number | null = null;
  let username: string | null = null;
  let firstName: string | null = null;
  let lastName: string | null = null;
  let photoUrl: string | null = null;

  // Проверяем наличие пользовательских данных
  // Telegram WebApp может передавать данные пользователя в разных форматах:
  // 1. Напрямую в параметрах: id, username, first_name, last_name
  // 2. В JSON-объекте внутри параметра user: { id, username, first_name, last_name }
  let userObj: any = null;
  if (params.has('user')) {
    try {
      userObj = JSON.parse(params.get('user') || '{}');
    } catch (e) {
      errors.push('Неверный формат данных пользователя (JSON)');
      isValid = false;
    }

    if (userObj) {
      userId = userObj.id || null;
      username = userObj.username || null;
      firstName = userObj.first_name || null;
      lastName = userObj.last_name || null;
      photoUrl = userObj.photo_url || null;
    }
  } else {
    userId = params.get('id') ? parseInt(params.get('id')!) : null;
    username = params.get('username') || null;
    firstName = params.get('first_name') || null;
    lastName = params.get('last_name') || null;
    photoUrl = params.get('photo_url') || null;
  }

  // Проверка на наличие userId
  if (requireUserId && !userId) {
    errors.push('Отсутствует id пользователя');
    isValid = false;
  }

  // Проверка на fallback ID=1
  if (userId === 1 && !allowFallbackId) {
    errors.push('Использование fallback ID=1 запрещено');
    isValid = false;
    
    // В этом случае явно помечаем userId как null
    // чтобы предотвратить его использование
    userId = null;
  }

  // Проверка подписи, если переданы все необходимые параметры и botToken
  let signatureValid = false;
  if (isValid && hash && botToken) {
    // Создание проверочной строки (без hash параметра)
    const checkParams = new URLSearchParams(initData);
    checkParams.delete('hash');

    // Сортировка параметров по алфавиту (требование Telegram API)
    const sortedParams: [string, string][] = [];
    checkParams.forEach((value, key) => {
      sortedParams.push([key, value]);
    });
    sortedParams.sort(([a], [b]) => a.localeCompare(b));

    // Формирование строки для проверки
    const dataCheckString = sortedParams.map(([key, value]) => `${key}=${value}`).join('\n');

    // Создание секретного ключа из токена бота
    const secretKey = createHash('sha256').update(botToken).digest();

    // Вычисление хеша
    const calculatedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Сравнение хешей
    signatureValid = calculatedHash === hash;

    if (!signatureValid && !isDevelopment) {
      errors.push('Недействительная подпись данных');
      isValid = false;
    }
  } else if (!botToken && !isDevelopment) {
    errors.push('Отсутствует токен бота для проверки подписи');
    isValid = false;
  }

  // В режиме разработки пропускаем некоторые проверки
  if (isDevelopment) {
    // Но сохраняем информацию о результатах проверок
    if (errors.length > 0) {
      console.warn('[DEV] Пропущены ошибки валидации Telegram initData:', errors);
    }
    
    if (!isValid) {
      console.warn('[DEV] В режиме разработки игнорируем ошибки валидации');
      isValid = true;
    }
  }

  // Формируем итоговый результат
  return {
    isValid,
    userId,
    username,
    firstName,
    lastName,
    photoUrl,
    startParam,
    authDate,
    rawInitData: initData,
    validationErrors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Извлекает ID пользователя из параметров Telegram initData
 * 
 * @param initData Строка initData из Telegram WebApp
 * @returns ID пользователя или null
 */
export function extractTelegramUserId(initData: string): number | null {
  if (!initData) return null;

  try {
    const params = new URLSearchParams(initData);
    
    // Проверяем формат данных (обычный или Mini App)
    if (params.has('user')) {
      // Данные в формате Mini App (параметр user содержит JSON)
      const userJson = params.get('user');
      if (!userJson) return null;
      
      const user = JSON.parse(userJson);
      return user && typeof user.id === 'number' ? user.id : null;
    } else {
      // Данные в обычном формате (параметр id содержит ID пользователя)
      const idStr = params.get('id');
      return idStr ? parseInt(idStr, 10) : null;
    }
  } catch (error) {
    console.error('Ошибка при извлечении Telegram ID:', error);
    return null;
  }
}

/**
 * Проверяет, не является ли ID пользователя запрещенным
 * (например, fallback ID=1 в продакшн-среде)
 */
export function isForbiddenUserId(userId: number | null): boolean {
  if (!userId) return true;
  
  // Проверка на fallback ID=1 в продакшн-среде
  if (userId === 1 && process.env.NODE_ENV === 'production') {
    return true;
  }
  
  // Добавьте здесь другие проверки при необходимости
  
  return false;
}

/**
 * Логирует Telegram ID пользователя для диагностики
 * @param user Объект с данными пользователя
 * @param source Источник логирования для однозначной идентификации места вызова
 */
export function logTelegramId(user: { telegram_id?: number | null, id?: number | null, username?: string | null }, source: string = 'Auth'): void {
  const IS_DEV = process.env.NODE_ENV === 'development';
  
  // В режиме разработки всегда логируем, в production - только если есть telegram_id
  if (IS_DEV || (user && user.telegram_id)) {
    console.log(`[${source}] Telegram ID: ${user?.telegram_id ?? 'null'} (User ID: ${user?.id ?? 'unknown'}, Username: ${user?.username ?? 'unknown'})`);
  }
}

/**
 * Логирует информацию о Telegram initData для отладки
 */
export function logTelegramData(
  initData: string | null | undefined,
  validationResult: TelegramValidationResult | null = null,
  context: string = ''
): void {
  const logPrefix = context ? `[${context}]` : '[Telegram]';
  
  if (!initData) {
    console.log(`${logPrefix} initData отсутствует`);
    return;
  }
  
  try {
    const params = new URLSearchParams(initData);
    const paramEntries: Record<string, string> = {};
    
    params.forEach((value, key) => {
      if (key === 'hash') {
        paramEntries[key] = `${value.substring(0, 10)}...`;
      } else if (key === 'user') {
        try {
          const user = JSON.parse(value);
          paramEntries[key] = `{id: ${user.id}, ...}`;
        } catch {
          paramEntries[key] = 'Invalid JSON';
        }
      } else {
        paramEntries[key] = value;
      }
    });
    
    console.log(`${logPrefix} Данные initData:`, paramEntries);
    
    if (validationResult) {
      console.log(`${logPrefix} Результат валидации:`, {
        isValid: validationResult.isValid,
        userId: validationResult.userId,
        username: validationResult.username,
        startParam: validationResult.startParam,
        errors: validationResult.validationErrors || []
      });
    }
  } catch (error) {
    console.error(`${logPrefix} Ошибка при логировании Telegram данных:`, error);
  }
}