/**
 * JWT Token Refresh Handler
 * Автоматическое обновление JWT токенов при истечении срока действия
 */

import { toast } from '@/hooks/use-toast';

interface TokenRefreshResult {
  success: boolean;
  token?: string;
  error?: string;
}

// Хранилище для предотвращения одновременных запросов на обновление
let refreshPromise: Promise<TokenRefreshResult> | null = null;

/**
 * Обновляет JWT токен через API
 */
async function refreshJWTToken(): Promise<TokenRefreshResult> {
  try {
    // Получаем текущий токен из localStorage
    const currentToken = localStorage.getItem('unifarm_jwt_token');
    
    if (!currentToken) {
      return {
        success: false,
        error: 'Токен отсутствует в localStorage'
      };
    }

    console.log('[TokenRefresh] Начинаем обновление токена...');
    
    const response = await fetch('/api/v2/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ token: currentToken }),
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[TokenRefresh] Ошибка обновления:', errorData);
      return {
        success: false,
        error: errorData.error || 'Не удалось обновить токен'
      };
    }

    const data = await response.json();
    
    if (data.success && data.data?.token) {
      // Сохраняем новый токен
      localStorage.setItem('unifarm_jwt_token', data.data.token);
      console.log('[TokenRefresh] ✅ Токен успешно обновлен');
      
      return {
        success: true,
        token: data.data.token
      };
    }

    return {
      success: false,
      error: 'Неверный формат ответа сервера'
    };

  } catch (error) {
    console.error('[TokenRefresh] Критическая ошибка:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
}

/**
 * Обрабатывает обновление токена с защитой от множественных запросов
 */
export async function handleTokenRefresh(): Promise<TokenRefreshResult> {
  // Если уже идет процесс обновления, ждем его завершения
  if (refreshPromise) {
    console.log('[TokenRefresh] Ожидаем завершения текущего обновления...');
    return refreshPromise;
  }

  // Создаем новый процесс обновления
  refreshPromise = refreshJWTToken();
  
  try {
    const result = await refreshPromise;
    
    if (!result.success) {
      // Показываем уведомление пользователю
      toast({
        title: "Ошибка авторизации",
        description: "Не удалось обновить токен. Попробуйте перезагрузить страницу.",
        variant: "destructive",
        duration: 5000
      });
    }
    
    return result;
  } finally {
    // Очищаем promise после завершения
    refreshPromise = null;
  }
}

/**
 * Проверяет, является ли ошибка связанной с истекшим токеном
 */
export function isTokenExpiredError(error: any): boolean {
  // Проверяем различные признаки истекшего токена
  return (
    error?.status === 401 ||
    error?.response?.status === 401 ||
    error?.message?.toLowerCase().includes('unauthorized') ||
    error?.message?.toLowerCase().includes('authentication required') ||
    error?.need_jwt_token === true ||
    error?.need_new_token === true
  );
}

/**
 * Извлекает дату истечения из JWT токена
 */
export function getTokenExpiry(token: string): Date | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp) {
      return new Date(payload.exp * 1000);
    }
  } catch (error) {
    console.error('[TokenRefresh] Ошибка парсинга токена:', error);
  }
  return null;
}

/**
 * Проверяет, скоро ли истечет токен (за 1 час до истечения)
 */
export function isTokenExpiringSoon(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return false;
  
  const now = new Date();
  const hourBeforeExpiry = new Date(expiry.getTime() - 60 * 60 * 1000);
  
  return now >= hourBeforeExpiry;
}