import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Декларация для Telegram Web App
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        expand: () => void;
        ready: () => void;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            username?: string;
          };
        };
      };
    };
  }
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
export function getUserIdFromURL(): string | null {
  // Пытаемся получить данные из Telegram WebApp
  if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    return String(window.Telegram.WebApp.initDataUnsafe.user.id);
  }
  
  // Пытаемся получить из параметров URL
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('user_id');
  
  if (userId) {
    return userId;
  }
  
  // В режиме разработки можно использовать фиксированный ID
  if (import.meta.env.DEV) {
    return '1'; // ID пользователя для разработки
  }
  
  return null;
}

/**
 * Извлекает ID реферера (пригласившего пользователя) из параметров URL Telegram Mini App
 * @returns ID реферера или null, если не найден
 */
export function getReferrerIdFromURL(): string | null {
  // Пытаемся получить из параметров URL
  const urlParams = new URLSearchParams(window.location.search);
  
  // Проверяем новый формат ссылки с параметром startapp
  const startappParam = urlParams.get('startapp');
  if (startappParam) {
    return startappParam;
  }
  
  // Проверяем старый формат ссылки с параметром start (для обратной совместимости)
  const startParam = urlParams.get('start');
  if (startParam) {
    return startParam;
  }
  
  return null;
}
