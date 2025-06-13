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
export function getUserIdFromURL(): string | null {// АУДИТ: Расширенная проверка данных из Telegram WebApp
  if (window.Telegram?.WebApp) {if (window.Telegram.WebApp.initDataUnsafe?.user?.id) {
      const telegramId = String(window.Telegram.WebApp.initDataUnsafe.user.id);// Кэшируем ID в localStorage
      try {
        localStorage.setItem('telegram_user_id', telegramId);} catch (err) {}
      
      return telegramId;
    } else {}
  } else {}
  
  // Пытаемся получить из параметров URL
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('user_id');
  
  if (userId) {return userId;
  }
  
  // Пытаемся восстановить из кэша в localStorage
  try {
    const cachedId = localStorage.getItem('telegram_user_id');
    if (cachedId) {return cachedId;
    }
  } catch (err) {}
  
  // В режиме разработки можно использовать фиксированный ID
  if (import.meta.env.DEV) {return '1'; // ID пользователя для разработки
  }return null;
}

/**
 * Извлекает ID реферера (пригласившего пользователя) из параметров URL Telegram Mini App
 * @returns ID реферера или null, если не найден
 */
export function getReferrerIdFromURL(): string | null {try {
    // Шаг 1: Проверяем прямые URL параметры
    const urlParams = new URLSearchParams(window.location.search);
    
    // Проверяем формат ссылки с параметром start
    let startParam = urlParams.get('start');
    
    // Если параметр start найден, проверяем формат "userXXX"
    if (startParam) {// Извлекаем userId из формата 'userXXX'
      if (startParam.startsWith('user')) {
        const referrerId = startParam.substring(4); // Отрезаем 'user'return referrerId;
      }
      return startParam; // Возвращаем как есть, если формат другой
    }
    
    // Сначала проверяем новый формат с параметром ref_code
    const refCodeParam = urlParams.get('ref_code');
    if (refCodeParam) {return refCodeParam;
    }
    
    // Проверяем старый формат ссылки с параметром startapp (для обратной совместимости)
    const startappParam = urlParams.get('startapp');
    if (startappParam) {return startappParam;
    }
    
    // Шаг 2: Проверяем данные Telegram WebApp с расширенной диагностикой
    if (window.Telegram?.WebApp) {// В Telegram WebApp параметр start передается как часть initData
      // или может быть доступен как startParam
      
      // @ts-ignore - startParam может быть недоступен в типе, но доступен в реальном API
      const telegramStartParam = window.Telegram.WebApp.startParam;
      if (telegramStartParam) {// Аналогично проверяем формат "userXXX"
        if (telegramStartParam.startsWith('user')) {
          const referrerId = telegramStartParam.substring(4);return referrerId;
        }
        return telegramStartParam;
      }
      
      // Также стоит проверить полное содержимое initData на наличие start=
      const initData = window.Telegram.WebApp.initData;
      if (initData && typeof initData === 'string') {
        const startMatch = initData.match(/start=([^&]+)/);
        if (startMatch && startMatch[1]) {
          const decodedStart = decodeURIComponent(startMatch[1]);if (decodedStart.startsWith('user')) {
            const referrerId = decodedStart.substring(4);return referrerId;
          }
          return decodedStart;
        }
      }
    }return null;
  } catch (error) {return null;
  }
}
