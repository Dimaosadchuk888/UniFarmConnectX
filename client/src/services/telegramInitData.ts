/**
 * Модуль для работы с идентификацией пользователя без зависимости от Telegram 
 * Этап 10.3: Полное удаление зависимости от Telegram WebApp initData
 */

import { GuestIdService } from './guestIdService';

/**
 * Представляет данные пользователя
 */
export interface TelegramInitData {
  // Данные пользователя
  userId?: number | string;  // Поддерживаем как числовой, так и строковый ID
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  
  // Метаданные запуска
  startParam?: string;
  platform?: string;
  authDate?: string;
  
  // Реферальные данные
  refCode?: string;  // Извлеченный реферальный код из URL параметров
  
  // Флаги состояния
  isValid: boolean;
  validationErrors: string[];
}

/**
 * Проверяет и извлекает данные пользователя, включая ref_code из URL
 * @returns Структурированные данные пользователя или ошибки
 */
export function extractTelegramInitData(): TelegramInitData {
  // Результат по умолчанию
  const result: TelegramInitData = {
    isValid: false,
    validationErrors: []
  };
  
  // Расширенное логирование состояния перед началом
  console.log('[telegramInitData] Начинаю извлечение данных пользователя:', {
    windowDefined: typeof window !== 'undefined',
    environment: typeof process !== 'undefined' ? process.env.NODE_ENV : 'unknown'
  });
  
  // Проверка основных объектов
  if (typeof window === 'undefined') {
    result.validationErrors.push('window объект недоступен (SSR)');
    return result;
  }
  
  // В режиме разработки возвращаем тестовые данные
  if (process.env.NODE_ENV === 'development') {
    console.log('[telegramInitData] Используем тестовые данные в режиме разработки');
    result.userId = 1;
    result.username = 'test_user';
    result.firstName = 'Test';
    result.lastName = 'User';
    result.isValid = true;
    
    // Пытаемся извлечь ref_code из URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('ref_code')) {
      result.refCode = urlParams.get('ref_code') || undefined;
      console.log('[telegramInitData] Извлечен ref_code из URL:', result.refCode);
    }
    
    return result;
  }
  
  // Пытаемся получить guest_id
  const guestId = GuestIdService.get();
  if (!guestId) {
    result.validationErrors.push('Отсутствует guest_id');
    return result;
  }
  
  console.log('[telegramInitData] Найден guest_id:', guestId);
  
  // Используем guest_id как идентификатор пользователя
  result.userId = guestId;
  
  // Пытаемся извлечь ref_code из URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('ref_code')) {
    result.refCode = urlParams.get('ref_code') || undefined;
    console.log('[telegramInitData] Извлечен ref_code из URL:', result.refCode);
  }
  
  // Устанавливаем флаг валидности
  result.isValid = true;
  
  // Подробный отчет в консоль для отладки
  console.log('[telegramInitData] Итоговые данные:', {
    isValid: result.isValid,
    userIdType: typeof result.userId,
    userId: result.userId || 'отсутствует',
    username: result.username || 'отсутствует',
    firstName: result.firstName || 'отсутствует',
    refCode: result.refCode || 'отсутствует',
    errors: result.validationErrors,
    isInIframe: window !== window.parent,
    isDev: process.env.NODE_ENV === 'development'
  });
  
  return result;
}

/**
 * Проверяет наличие корректного ID пользователя
 * @returns true, если имеются корректные данные пользователя
 */
export function hasTelegramUserId(): boolean {
  const telegramData = extractTelegramInitData();
  // В режиме разработки всегда возвращаем true
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  return telegramData.isValid && !!telegramData.userId;
}

/**
 * Извлекает User ID с проверкой валидности
 * @returns ID пользователя или null, если ID недоступен или некорректен
 */
export function getTelegramUserId(): number | null {
  // В режиме разработки возвращаем тестовый ID
  if (process.env.NODE_ENV === 'development') {
    return 1;
  }
  
  const telegramData = extractTelegramInitData();
  
  if (telegramData.isValid && telegramData.userId) {
    // Если ID представлен в виде строки, пробуем преобразовать в число
    if (typeof telegramData.userId === 'string') {
      const numericId = Number(telegramData.userId);
      if (!isNaN(numericId)) {
        return numericId;
      }
    } else if (typeof telegramData.userId === 'number') {
      return telegramData.userId;
    }
  }
  
  // Выводим причину недоступности ID
  console.warn('[telegramInitData] ID недоступен:', 
               telegramData.validationErrors.join('; '));
  
  return null;
}

/**
 * Извлекает параметр запуска
 * @returns startParam или null, если он недоступен
 */
export function getTelegramStartParam(): string | null {
  const telegramData = extractTelegramInitData();
  return telegramData.startParam || null;
}

/**
 * Извлекает реферальный код из URL параметров
 * @returns ref_code или null, если он недоступен
 */
export function getTelegramRefCode(): string | null {
  const telegramData = extractTelegramInitData();
  
  if (telegramData.refCode) {
    console.log('[telegramRefCode] Успешно извлечен реферальный код:', telegramData.refCode);
    return telegramData.refCode;
  }
  
  // Пробуем извлечь из URL напрямую
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('ref_code')) {
      const refCode = urlParams.get('ref_code');
      if (refCode) {
        console.log('[telegramRefCode] Извлечен реферальный код из URL:', refCode);
        return refCode;
      }
    }
  }
  
  console.warn('[telegramRefCode] Реферальный код не найден');
  return null;
}

/**
 * Проверяет запущено ли приложение в среде Telegram WebApp
 * Переопределена для совместимости - всегда возвращает true
 */
export function isTelegramWebApp(): boolean {
  return true;
}