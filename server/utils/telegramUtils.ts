/**
 * Утилиты для работы с Telegram Mini App
 */

import crypto from 'crypto';

/**
 * Проверяет валидность данных Telegram Mini App
 * @param initData - Строка инициализации от Telegram Mini App
 * @returns Результат проверки
 */
export function verifyTelegramWebAppData(initData: string): { 
  isValid: boolean; 
  userId?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  errors?: string[]; 
} {
  try {
    // Если initData пустой, возвращаем ошибку
    if (!initData) {
      return { isValid: false, errors: ['Отсутствуют данные initData'] };
    }

    // Парсим параметры из строки initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    if (!hash) {
      return { isValid: false, errors: ['Отсутствует hash в initData'] };
    }

    // Создаем копию объекта URLSearchParams без hash параметра для проверки
    const dataParams = new URLSearchParams(initData);
    dataParams.delete('hash');

    // Сортируем параметры в алфавитном порядке
    const sortedParams: [string, string][] = [];
    dataParams.forEach((value, key) => {
      sortedParams.push([key, value]);
    });
    
    sortedParams.sort(([a], [b]) => a.localeCompare(b));

    // Создаем строку для проверки подписи
    const dataCheckString = sortedParams
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Создаем HMAC-SHA256 хеш
    const secretKey = crypto.createHmac('sha256', 'WebAppData')
      .update(process.env.TELEGRAM_BOT_TOKEN || '')
      .digest();

    const generatedHash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Проверяем, совпадает ли хеш
    const isValid = generatedHash === hash;

    // Если данные валидны, извлекаем информацию о пользователе
    if (isValid) {
      const user = params.get('user') ? JSON.parse(params.get('user') || '{}') : {};
      
      return {
        isValid: true,
        userId: user.id?.toString(),
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name
      };
    }

    return { isValid: false, errors: ['Неверная подпись hash'] };
  } catch (error) {
    const err = error as Error;
    return { isValid: false, errors: [`Ошибка проверки: ${err.message}`] };
  }
}

/**
 * Получает параметр из start параметра Telegram
 * @param startParam - Строка start параметра
 * @returns Декодированный параметр
 */
export function extractReferralCodeFromStartParam(startParam: string | null): string | null {
  if (!startParam) return null;
  
  // Если стартовый параметр соответствует формату реферального кода, возвращаем его
  if (/^[A-Z0-9]{8}$/.test(startParam)) {
    return startParam;
  }
  
  // Пытаемся декодировать URL-encoded или base64 параметр
  try {
    // Проверяем URL-encoded параметр
    if (startParam.includes('%')) {
      const decoded = decodeURIComponent(startParam);
      if (/^[A-Z0-9]{8}$/.test(decoded)) {
        return decoded;
      }
    }
    
    // Пытаемся расшифровать как base64
    const decoded = Buffer.from(startParam, 'base64').toString('utf-8');
    if (/^[A-Z0-9]{8}$/.test(decoded)) {
      return decoded;
    }
  } catch (e) {
    // Если произошла ошибка декодирования, просто игнорируем
  }
  
  return null;
}