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
 * Форматирует число с заданной точностью
 * @param value Число для форматирования
 * @param precision Количество цифр после запятой
 * @returns Отформатированное число в виде строки
 */
export function formatNumberWithPrecision(value: number, precision: number = 2): string {
  // Проверяем, что значение существует и является числом
  if (value === undefined || value === null || isNaN(value)) {
    return "0".padEnd(precision + 2, "0");
  }
  
  // Для очень малых чисел используем научную нотацию, которую корректно преобразуем
  if (value > 0 && value < Math.pow(10, -precision)) {
    // Для значений меньше минимального отображаемого с текущей точностью
    // Всегда показываем реальное значение, а не нули
    return value.toFixed(precision);
  }
  
  // Стандартное форматирование для обычных чисел
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
