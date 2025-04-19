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
  
  // Форматируем число с заданной точностью
  const valueStr = value.toFixed(precision);
  
  // Убираем лишние нули в конце, но оставляем минимум precision знаков
  const parts = valueStr.split('.');
  if (parts.length === 2) {
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Если значение близко к нулю (меньше 0.00001), показываем "0.00000"
    if (value > 0 && value < 0.00001) {
      return "0".padEnd(precision + 2, "0");
    }
    
    // Приводим к заданной точности
    return `${integerPart}.${decimalPart}`;
  }
  
  return valueStr;
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
