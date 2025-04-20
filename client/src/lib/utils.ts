import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Форматирует число с заданной точностью, корректно обрабатывая очень маленькие значения
 * @param value Число для форматирования
 * @param precision Количество цифр после запятой
 * @returns Отформатированное число в виде строки
 */
export function formatNumberWithPrecision(value: number, precision: number = 2): string {
  // Проверяем, что значение существует и является числом
  if (value === undefined || value === null || isNaN(value)) {
    return "0".padEnd(precision + 2, "0");
  }
  
  // Преобразуем научную нотацию в строковое представление
  // Если число очень маленькое (например, 4.629629621e-7)
  if (value > 0 && value < Math.pow(10, -precision)) {
    // Создаем строку с фиксированным числом значащих цифр
    // Это гарантирует, что мы увидим ненулевые цифры для очень маленьких чисел
    const significantDigits = precision + 2;
    let formatted = value.toExponential(significantDigits);
    
    // Преобразуем научную запись в десятичную форму
    const match = formatted.match(/^(\d+\.\d+)e([+-])(\d+)$/);
    if (match) {
      const base = parseFloat(match[1]);
      const sign = match[2];
      const exponent = parseInt(match[3], 10);
      
      if (sign === '-') {
        // Для отрицательной степени (очень маленькие числа)
        // Добавляем нужное количество нулей после запятой
        let result = '0.';
        for (let i = 0; i < exponent - 1; i++) {
          result += '0';
        }
        
        // Добавляем значащие цифры из мантиссы без десятичной точки
        result += base.toString().replace('.', '');
        
        // Обрезаем до заданной точности, если результат слишком длинный
        const decimalPart = result.split('.')[1] || '';
        if (decimalPart.length > precision) {
          return result.substring(0, result.indexOf('.') + precision + 1);
        }
        
        return result;
      }
    }
  }
  
  // Для обычных чисел используем стандартное форматирование
  return value.toFixed(precision);
}

/**
 * Извлекает userId из параметров URL Telegram Mini App
 * @returns userId или null, если не найден
 */
/**
 * Получает userId из различных источников с приоритетом:
 * 1. Telegram WebApp initDataUnsafe
 * 2. URL параметры
 * 3. Кэш в localStorage
 * 4. Фиксированный ID для разработки
 * @returns userId или null
 */
export function getUserIdFromURL(): string | null {
  console.log('[utils] Getting user ID from all available sources');
  
  // Пытаемся получить данные из Telegram WebApp
  if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    const telegramId = String(window.Telegram.WebApp.initDataUnsafe.user.id);
    console.log('[utils] Found user ID in Telegram WebApp:', telegramId);
    
    // Кэшируем ID в localStorage
    try {
      localStorage.setItem('telegram_user_id', telegramId);
      console.log('[utils] Cached Telegram user ID in localStorage');
    } catch (err) {
      console.warn('[utils] Failed to cache user ID:', err);
    }
    
    return telegramId;
  }
  
  // Пытаемся получить из параметров URL
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('user_id');
  
  if (userId) {
    console.log('[utils] Found user ID in URL parameters:', userId);
    return userId;
  }
  
  // Пытаемся восстановить из кэша в localStorage
  try {
    const cachedId = localStorage.getItem('telegram_user_id');
    if (cachedId) {
      console.log('[utils] Restored user ID from localStorage cache:', cachedId);
      return cachedId;
    }
  } catch (err) {
    console.warn('[utils] Error accessing localStorage:', err);
  }
  
  // В режиме разработки можно использовать фиксированный ID
  if (import.meta.env.DEV) {
    console.log('[utils] Using development user ID');
    return '1'; // ID пользователя для разработки
  }
  
  console.log('[utils] No user ID found from any source');
  return null;
}

/**
 * Извлекает ID реферера (пригласившего пользователя) из параметров URL Telegram Mini App
 * @returns ID реферера или null, если не найден
 */
export function getReferrerIdFromURL(): string | null {
  // Пытаемся получить из параметров URL
  const urlParams = new URLSearchParams(window.location.search);
  
  // Проверяем формат ссылки с параметром start
  const startParam = urlParams.get('start');
  if (startParam) {
    return startParam;
  }
  
  // Проверяем старый формат ссылки с параметром startapp (для обратной совместимости)
  const startappParam = urlParams.get('startapp');
  if (startappParam) {
    return startappParam;
  }
  
  return null;
}
