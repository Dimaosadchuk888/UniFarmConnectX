import crypto from 'crypto';

/**
 * Результат валидации данных Telegram
 */
export interface TelegramValidationResult {
  isValid: boolean;
  userId: number | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  startParam?: string | null;
  errors?: string[];
  validationErrors?: string[];
}

/**
 * Алиас для функции validateTelegramInitData для обратной совместимости
 */
export async function verifyTelegramWebAppData(initData: string, botToken?: string, options?: ValidationOptions | boolean): Promise<TelegramValidationResult> {
  // Получаем токен из переменных окружения, если он не передан
  const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.error('[TelegramUtils] Не указан токен бота Telegram');
    return {
      isValid: false,
      userId: null,
      errors: ['Не указан токен бота Telegram'],
      validationErrors: ['Не указан токен бота Telegram']
    };
  }
  
  return validateTelegramInitData(initData, token, options);
}

/**
 * Извлекает код реферера из параметра startParam в инициализационных данных Telegram
 */
export function extractReferralCode(initData: string): string | null {
  try {
    const extractedData = extractTelegramData(initData);
    return extractedData.startParam;
  } catch (error) {
    console.error('[TelegramUtils] Ошибка при извлечении реферального кода:', error);
    return null;
  }
}

/**
 * Параметры валидации данных Telegram
 */
export interface ValidationOptions {
  maxAgeSeconds?: number;
  isDevelopment?: boolean;
  requireUserId?: boolean;
  allowFallbackId?: boolean;
  verboseLogging?: boolean;
  skipSignatureCheck?: boolean;
}

/**
 * Парсит initData Telegram и проверяет подлинность данных с помощью HMAC-SHA-256
 */
export function validateTelegramInitData(
  initData: string,
  botToken: string,
  options: ValidationOptions | boolean = false
): TelegramValidationResult {
  // Преобразуем старый формат (isDevelopment: boolean) в новый формат опций
  const isDevelopment = typeof options === 'boolean' ? options : options.isDevelopment || false;
  
  // Устанавливаем значения по умолчанию, если передан объект опций
  const validationOptions = typeof options === 'object' ? options : {
    isDevelopment,
    maxAgeSeconds: 86400, // 24 часа по умолчанию
    requireUserId: true,
    allowFallbackId: isDevelopment,
    verboseLogging: isDevelopment,
    skipSignatureCheck: isDevelopment
  };
  
  // В режиме разработки можно пропустить валидацию, если указан skipSignatureCheck
  if (isDevelopment && validationOptions.skipSignatureCheck) {
    return {
      isValid: true,
      userId: null,
      validationErrors: ["Validation skipped in development mode"],
      errors: ["Validation skipped in development mode"],
    };
  }

  // Пустые данные считаем невалидными
  if (!initData || !botToken) {
    return {
      isValid: false,
      userId: null,
      errors: ["Empty initData or botToken"],
    };
  }

  try {
    // Разбираем строку initData на параметры
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      return {
        isValid: false,
        userId: null,
        errors: ["Missing hash parameter"],
      };
    }

    // Удаляем hash из проверочной строки
    urlParams.delete('hash');

    // Сортируем оставшиеся параметры в алфавитном порядке
    const keys = Array.from(urlParams.keys()).sort();
    
    // Создаем строку для проверки в формате key=value&key2=value2
    const dataCheckString = keys.map(key => `${key}=${urlParams.get(key)}`).join('\n');
    
    // Создаем HMAC-SHA-256 с использованием токена бота в качестве ключа
    const secretKey = crypto.createHash('sha256')
      .update(botToken)
      .digest();

    const hmac = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    // Сравниваем результат с полученным хешем
    const isValid = hmac === hash;
    
    // Если данные валидны, извлекаем информацию пользователя
    let userId: number | null = null;
    let username: string | null = null;
    let firstName: string | null = null;
    let lastName: string | null = null;
    let startParam: string | null = null;
    
    // Получаем startParam из URL параметров
    startParam = urlParams.get('start_param');
    
    if (isValid) {
      // Проверяем наличие параметра user
      const userJson = urlParams.get('user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          userId = user.id || null;
          username = user.username || null;
          firstName = user.first_name || null;
          lastName = user.last_name || null;
          
          if (validationOptions.verboseLogging) {
            console.log('[TelegramUtils] Extracted user data:', {
              userId,
              username,
              firstName: firstName ? `${firstName.substring(0, 1)}...` : null,
              lastName: lastName ? `${lastName.substring(0, 1)}...` : null,
              startParam
            });
          }
        } catch (err) {
          return {
            isValid: true,
            userId: null,
            username: null,
            firstName: null,
            lastName: null,
            startParam,
            errors: ["Failed to parse user JSON"],
            validationErrors: ["Failed to parse user JSON"]
          };
        }
      }
    }
    
    // В режиме разработки, если нет userId, можно использовать fallback
    if (isDevelopment && validationOptions.allowFallbackId && userId === null) {
      userId = 1; // Тестовый ID для разработки
      if (validationOptions.verboseLogging) {
        console.log('[TelegramUtils] Using fallback userId=1 in development mode');
      }
    }
    
    return {
      isValid,
      userId,
      username,
      firstName,
      lastName,
      startParam,
      errors: isValid ? undefined : ["Invalid hash"],
      validationErrors: isValid ? undefined : ["Invalid hash"],
    };
  } catch (error) {
    console.error("Error validating Telegram initData:", error);
    return {
      isValid: false,
      userId: null,
      username: null,
      firstName: null,
      lastName: null,
      startParam: null,
      errors: [(error as Error).message],
      validationErrors: [(error as Error).message]
    };
  }
}

/**
 * Простое извлечение данных из строки initData Telegram без валидации
 */
export function extractTelegramData(initData: string): {
  userId: number | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  startParam: string | null;
} {
  try {
    const urlParams = new URLSearchParams(initData);
    const userJson = urlParams.get('user');
    const startParam = urlParams.get('start_param');
    
    if (!userJson) {
      return {
        userId: null,
        username: null,
        firstName: null,
        lastName: null,
        startParam: startParam,
      };
    }
    
    const user = JSON.parse(userJson);
    
    return {
      userId: user.id || null,
      username: user.username || null,
      firstName: user.first_name || null,
      lastName: user.last_name || null,
      startParam: startParam,
    };
  } catch (error) {
    console.error("Error extracting Telegram data:", error);
    return {
      userId: null,
      username: null,
      firstName: null,
      lastName: null,
      startParam: null,
    };
  }
}

/**
 * Проверяет, является ли строка валидными данными Telegram initData
 */
export function isTelegramInitData(data: string): boolean {
  try {
    if (!data) return false;
    
    const urlParams = new URLSearchParams(data);
    
    // Проверяем минимальный набор параметров, которые должны быть в initData
    return (
      urlParams.has('hash') &&
      urlParams.has('auth_date') &&
      (urlParams.has('user') || urlParams.has('query_id'))
    );
  } catch (error) {
    return false;
  }
}

/**
 * Логирует данные Telegram для отладки
 */
export function logTelegramData(
  initData: string | null | undefined,
  validationResult: TelegramValidationResult | null = null,
  source: string = 'unknown'
): void {
  console.log(`[${source}] [TelegramDebug] Logging Telegram data...`);
  
  if (!initData) {
    console.log(`[${source}] [TelegramDebug] No initData provided`);
    return;
  }
  
  try {
    // Безопасный парсинг данных
    let dataObj: Record<string, any> = {};
    try {
      if (initData.includes('=') && initData.includes('&')) {
        // Это URLSearchParams строка
        const params = new URLSearchParams(initData);
        params.forEach((value, key) => {
          // Для безопасности маскируем хеш
          if (key === 'hash') {
            dataObj[key] = `***MASKED_HASH[${value.length}]***`;
          } else if (key === 'user' && value) {
            try {
              const userObj = JSON.parse(value);
              // Маскируем полное имя пользователя, если есть
              if (userObj.first_name) {
                userObj.first_name = `${userObj.first_name.substring(0, 1)}...`;
              }
              if (userObj.last_name) {
                userObj.last_name = `${userObj.last_name.substring(0, 1)}...`;
              }
              // Для безопасности маскируем номер телефона, если есть
              if (userObj.phone_number) {
                userObj.phone_number = `***MASKED_PHONE***`;
              }
              dataObj[key] = userObj;
            } catch {
              dataObj[key] = `***INVALID_USER_JSON[${value.length}]***`;
            }
          } else {
            dataObj[key] = value;
          }
        });
      } else {
        // Это может быть JSON или другой формат
        console.log(`[${source}] [TelegramDebug] initData format is not URL params, length: ${initData.length}`);
        dataObj = { raw_length: initData.length };
      }
    } catch (error) {
      console.error(`[${source}] [TelegramDebug] Error parsing initData:`, error);
      dataObj = { parse_error: true, length: initData.length };
    }
    
    // Логируем обработанные данные
    console.log(`[${source}] [TelegramDebug] Parsed Telegram data:`, dataObj);
    
    // Если есть результат валидации, логируем его тоже
    if (validationResult) {
      console.log(`[${source}] [TelegramDebug] Validation result:`, {
        isValid: validationResult.isValid,
        userId: validationResult.userId,
        errors: validationResult.errors || 'none'
      });
    }
  } catch (error) {
    console.error(`[${source}] [TelegramDebug] Unexpected error during logging:`, error);
  }
}