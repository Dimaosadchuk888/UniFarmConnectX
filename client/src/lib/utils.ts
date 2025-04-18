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
