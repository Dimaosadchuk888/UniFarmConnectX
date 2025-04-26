import crypto from 'crypto';

export interface TelegramValidationResult {
  isValid: boolean;
  userId?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  startParam?: string;
  validationErrors?: string[];
  errors?: string[];
}

interface TelegramInitDataUnsafe {
  user?: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  auth_date?: string;
  hash?: string;
  start_param?: string;
  [key: string]: any;
}

interface ValidationOptions {
  maxAgeSeconds?: number;
  requireUserId?: boolean;
  allowFallbackId?: boolean;
  isDevelopment?: boolean;
  verboseLogging?: boolean;
  skipSignatureCheck?: boolean;
}

/**
 * Проверяет подлинность данных от Telegram WebApp
 * @param initData - Строка initData из Telegram WebApp
 * @returns Объект с результатом проверки
 */
export async function verifyTelegramWebAppData(initData: string): Promise<TelegramValidationResult> {
  try {
    if (!initData || typeof initData !== 'string') {
      return {
        isValid: false,
        errors: ['Отсутствуют данные initData']
      };
    }

    // Проверяем наличие BOT_TOKEN в переменных окружения
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.error('[telegramUtils] Ошибка: не найден TELEGRAM_BOT_TOKEN в переменных окружения');
      return {
        isValid: false,
        errors: ['Отсутствует токен бота в конфигурации']
      };
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const tokenParts = token.split(':');
    if (tokenParts.length !== 2) {
      console.error('[telegramUtils] Ошибка: некорректный формат токена бота');
      return {
        isValid: false,
        errors: ['Некорректный формат токена бота']
      };
    }

    // Разбираем initData на параметры
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    const authDate = urlParams.get('auth_date');
    
    if (!hash || !authDate) {
      return {
        isValid: false,
        errors: ['Отсутствуют обязательные параметры (hash или auth_date)']
      };
    }

    // Создаем строку для проверки, сортируя параметры в алфавитном порядке
    let dataCheckString = '';
    const params = Array.from(urlParams.entries())
      .filter(([key]) => key !== 'hash')
      .sort(([a], [b]) => a.localeCompare(b));

    for (const [key, value] of params) {
      dataCheckString += `${key}=${value}\n`;
    }
    dataCheckString = dataCheckString.trim();

    // Создаем секретный ключ на основе токена бота
    const secretKey = crypto.createHash('sha256')
      .update(token)
      .digest();

    // Вычисляем HMAC для проверки подписи
    const hmac = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Проверяем совпадение хешей
    if (hmac !== hash) {
      return {
        isValid: false,
        errors: ['Неверная подпись данных Telegram']
      };
    }

    // Проверяем срок действия (30 дней)
    const currentDate = Math.floor(Date.now() / 1000);
    const authDateTimestamp = parseInt(authDate);
    const maxAge = 30 * 24 * 60 * 60; // 30 дней в секундах

    if (currentDate - authDateTimestamp > maxAge) {
      return {
        isValid: false,
        errors: ['Данные устарели (более 30 дней)']
      };
    }

    // Извлекаем данные пользователя из initData
    let userId: number | undefined;
    let username: string | undefined;
    let firstName: string | undefined;
    let lastName: string | undefined;

    // Проверяем наличие данных пользователя
    const userDataString = urlParams.get('user');
    if (userDataString) {
      try {
        const userData = JSON.parse(userDataString) as TelegramInitDataUnsafe['user'];
        if (userData) {
          userId = userData.id;
          username = userData.username;
          firstName = userData.first_name;
          lastName = userData.last_name;
        }
      } catch (err) {
        console.error('[telegramUtils] Ошибка при разборе данных пользователя:', err);
        return {
          isValid: false,
          errors: ['Ошибка при разборе данных пользователя']
        };
      }
    } else {
      return {
        isValid: false,
        errors: ['Отсутствуют данные пользователя']
      };
    }

    // Возвращаем успешный результат с данными пользователя
    return {
      isValid: true,
      userId,
      username,
      firstName,
      lastName
    };
  } catch (error) {
    console.error('[telegramUtils] Ошибка при верификации данных Telegram:', error);
    return {
      isValid: false,
      errors: ['Внутренняя ошибка при проверке данных Telegram']
    };
  }
}

/**
 * Функция для логирования данных Telegram в более удобном формате
 */
export function logTelegramData(initData: string | null, telegramId: number | null, source: string = 'unknown'): void {
  console.log(`[${source}] [TelegramData] Logging Telegram data`);
  
  if (!initData) {
    console.log(`[${source}] [TelegramData] No initData provided`);
    return;
  }
  
  // Логируем длину данных
  console.log(`[${source}] [TelegramData] initData length: ${initData.length}`);
  
  try {
    // Проверяем формат данных
    if (initData.includes('=') && initData.includes('&')) {
      // Формат URL-параметров
      console.log(`[${source}] [TelegramData] Format: URL parameters`);
      
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');
      const authDate = params.get('auth_date');
      const userStr = params.get('user');
      const startParam = params.get('start_param');
      
      console.log(`[${source}] [TelegramData] URL params: hash=${!!hash}, auth_date=${authDate || 'n/a'}, user=${!!userStr}, start_param=${startParam || 'n/a'}`);
      
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          console.log(`[${source}] [TelegramData] User: id=${user.id || 'n/a'}, username=${user.username || 'n/a'}, first_name=${user.first_name || 'n/a'}`);
        } catch (e) {
          console.error(`[${source}] [TelegramData] Failed to parse user data from URL params:`, e);
        }
      }
    } else {
      // Возможно JSON формат
      try {
        const jsonData = JSON.parse(initData);
        console.log(`[${source}] [TelegramData] Format: JSON`);
        console.log(`[${source}] [TelegramData] JSON keys:`, Object.keys(jsonData));
        
        if (jsonData.user) {
          console.log(`[${source}] [TelegramData] User: id=${jsonData.user.id || 'n/a'}, username=${jsonData.user.username || 'n/a'}, first_name=${jsonData.user.first_name || 'n/a'}`);
        }
      } catch (e) {
        // Не JSON, логируем начало строки для анализа
        console.log(`[${source}] [TelegramData] Format: Unknown (not JSON)`);
        console.log(`[${source}] [TelegramData] Data sample: ${initData.substring(0, 50)}...`);
      }
    }
  } catch (error) {
    console.error(`[${source}] [TelegramData] Error parsing Telegram data:`, error);
  }
  
  // Если указан telegramId, логируем его
  if (telegramId) {
    console.log(`[${source}] [TelegramData] Provided Telegram ID: ${telegramId}`);
  }
}

/**
 * Валидирует данные Telegram WebApp для совместимости с существующим кодом
 */
/**
 * Проверяет, является ли Telegram ID запрещенным (системным)
 * @param userId - ID пользователя Telegram
 * @returns true если ID запрещен к использованию
 */
export function isForbiddenUserId(userId?: number): boolean {
  if (!userId) return true;
  
  // Проверяем, является ли ID системным или техническим
  const forbiddenIds = [
    1, // Служебный ID
    777000, // Telegram Notifications
    1087968824, // Group Anonymous Bot
    136817688, // Channel Bot
    5792438613, // Telegram Bot API
    1111111111, // Тестовый ID (нереальный)
    999999999, // Тестовый ID (нереальный)
    12345, // Тестовый ID (нереальный)
  ];
  
  // Если ID слишком маленький (<10000), считаем его подозрительным
  // т.к. реальные пользователи Telegram имеют ID > 10000
  if (userId < 10000 && process.env.NODE_ENV === 'production') {
    console.warn(`[telegramUtils] Подозрительный маленький Telegram ID: ${userId}`);
    return true;
  }
  
  return forbiddenIds.includes(userId);
}

export function validateTelegramInitData(
  initData: string, 
  botToken?: string,
  options: ValidationOptions = {}
): TelegramValidationResult {
  // Значения по умолчанию для опций
  const {
    maxAgeSeconds = 86400, // 24 часа по умолчанию
    requireUserId = true,
    allowFallbackId = false,
    isDevelopment = process.env.NODE_ENV !== 'production',
    verboseLogging = false,
    skipSignatureCheck = false
  } = options;
  
  // Результат по умолчанию
  const result: TelegramValidationResult = {
    isValid: false,
    validationErrors: []
  };
  
  try {
    if (!initData || typeof initData !== 'string') {
      result.validationErrors?.push('Пустые данные initData');
      return result;
    }
    
    // Используем текущий токен бота, если не передан
    const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
      result.validationErrors?.push('Отсутствует токен бота');
      return result;
    }
    
    // Создаем URLSearchParams для разбора параметров
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    const authDate = urlParams.get('auth_date');
    const userDataStr = urlParams.get('user');
    const startParam = urlParams.get('start_param');
    
    // Проверяем обязательные параметры
    if (!hash) {
      result.validationErrors?.push('Отсутствует параметр hash');
      return result;
    }
    
    if (!authDate) {
      result.validationErrors?.push('Отсутствует параметр auth_date');
      return result;
    }
    
    // Проверяем срок действия данных
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const authTimestamp = parseInt(authDate);
    
    if (isNaN(authTimestamp)) {
      result.validationErrors?.push('Некорректный формат параметра auth_date');
      return result;
    }
    
    const timeDiff = currentTimestamp - authTimestamp;
    
    if (timeDiff > maxAgeSeconds) {
      result.validationErrors?.push(`Данные устарели (${Math.floor(timeDiff / 3600)} часов)`);
      return result;
    }
    
    // В режиме разработки пропускаем проверку подписи, если указано
    if (isDevelopment && skipSignatureCheck) {
      if (verboseLogging) {
        console.log('[telegramUtils] Пропускаем проверку подписи в режиме разработки');
      }
    } else {
      // Создаем строку для проверки (data_check_string)
      let dataCheckStr = '';
      const params = Array.from(urlParams.entries())
        .filter(([key]) => key !== 'hash')
        .sort(([a], [b]) => a.localeCompare(b));
      
      for (const [key, value] of params) {
        dataCheckStr += `${key}=${value}\n`;
      }
      dataCheckStr = dataCheckStr.trim();
      
      // Создаем секретный ключ на основе токена бота
      const secretKey = crypto.createHash('sha256')
        .update(token)
        .digest();
      
      // Вычисляем HMAC для проверки подписи
      const calculatedHash = crypto.createHmac('sha256', secretKey)
        .update(dataCheckStr)
        .digest('hex');
      
      // Проверяем совпадение хешей
      if (calculatedHash !== hash) {
        result.validationErrors?.push('Неверная подпись данных');
        return result;
      }
    }
    
    // Пытаемся извлечь данные пользователя
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        
        if (!userData || typeof userData !== 'object') {
          result.validationErrors?.push('Некорректный формат данных пользователя');
          return result;
        }
        
        // Проверяем наличие ID пользователя
        if (requireUserId && !userData.id) {
          result.validationErrors?.push('Отсутствует ID пользователя');
          return result;
        }
        
        // Добавляем данные пользователя в результат
        result.userId = userData?.id;
        result.username = userData?.username;
        result.firstName = userData?.first_name;
        result.lastName = userData?.last_name;
        
        // Если в режиме разработки и разрешен fallbackId, используем ID=1
        if (isDevelopment && allowFallbackId && !result.userId) {
          result.userId = 1;
          if (verboseLogging) {
            console.log('[telegramUtils] Используем fallback ID=1 в режиме разработки');
          }
        }
      } catch (error) {
        result.validationErrors?.push('Ошибка при разборе данных пользователя');
        return result;
      }
    } else {
      result.validationErrors?.push('Отсутствуют данные пользователя');
      return result;
    }
    
    // Добавляем параметр start, если он есть
    if (startParam) {
      result.startParam = startParam;
    }
    
    // Если дошли до этого места, все проверки пройдены
    result.isValid = true;
    result.validationErrors = [];
    
    return result;
  } catch (error) {
    result.validationErrors?.push(`Внутренняя ошибка: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

/**
 * Извлекает реферальный код из startParam Telegram WebApp
 * @param startParam - Параметр start из Telegram WebApp
 * @returns Реферальный код или null
 */
export function extractReferralCode(startParam?: string): string | null {
  if (!startParam) return null;

  // Формат 1: Прямой формат ref_CODE
  if (startParam.startsWith('ref_')) {
    return startParam;
  }

  // Формат 2: startapp=ref_CODE или другие параметры с ref_CODE
  if (startParam.includes('=ref_')) {
    const match = startParam.match(/=ref_([^&]+)/);
    if (match && match[1]) {
      return `ref_${match[1]}`;
    }
  }

  // Формат 3: ref-CODE (через дефис)
  if (startParam.startsWith('ref-')) {
    const code = startParam.substring(4);
    return `ref_${code}`;
  }

  // Формат 4: refcode_CODE или refcode-CODE
  if (startParam.startsWith('refcode_') || startParam.startsWith('refcode-')) {
    const code = startParam.substring(8);
    return `ref_${code}`;
  }

  // Формат 5: Произвольный формат, где ref_code может быть частью URL-параметров
  const refPattern = /ref[_\-]([a-zA-Z0-9]+)/i;
  const match = startParam.match(refPattern);
  if (match && match[1]) {
    return `ref_${match[1]}`;
  }

  // Если ничего не нашли, но startParam выглядит как возможный код,
  // используем весь startParam как код
  if (/^[a-zA-Z0-9]{6,}$/.test(startParam)) {
    return `ref_${startParam}`;
  }

  return null;
}