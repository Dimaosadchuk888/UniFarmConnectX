/**
 * Утилита для корректного выполнения API запросов с обработкой Telegram WebApp данных
 */

import { toast } from '@/hooks/use-toast';

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  credentials?: RequestCredentials;
}

// Хранилище для предотвращения спама уведомлениями о rate limit
let lastRateLimitToastTime = 0;
const RATE_LIMIT_TOAST_COOLDOWN = 10000; // 10 секунд между уведомлениями

export async function correctApiRequest(url: string, method: string = 'GET', body?: any, headers: Record<string, string> = {}) {
  const credentials = 'include';

  // Базовые заголовки
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...headers
  };

  // Добавляем JWT токен из localStorage
  const token = localStorage.getItem('unifarm_jwt_token');
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Добавляем Telegram WebApp данные если доступны
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
    requestHeaders['X-Telegram-Init-Data'] = window.Telegram.WebApp.initData;
  }

  // Конфигурация запроса
  const requestConfig: RequestInit = {
    method,
    headers: requestHeaders,
    credentials
  };

  // Добавляем тело запроса для методов с данными
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    requestConfig.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  try {
    console.log('[correctApiRequest] Отправка запроса:', {
      url,
      method,
      body,
      headers: requestHeaders
    });
    
    const response = await fetch(url, requestConfig);
    
    console.log('[correctApiRequest] Получен ответ:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    });
    
    // Проверяем статус ответа
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[correctApiRequest] Ошибка ответа:', errorData);
      
      // Обработка 429 - Too Many Requests
      if (response.status === 429) {
        const currentTime = Date.now();
        
        // Проверяем, нужно ли показывать toast (не более 1 раза в 10 секунд)
        if (currentTime - lastRateLimitToastTime > RATE_LIMIT_TOAST_COOLDOWN) {
          lastRateLimitToastTime = currentTime;
          
          // Показываем уведомление пользователю
          toast({
            title: "Слишком много запросов",
            description: errorData.error || "Пожалуйста, подождите немного и попробуйте снова",
            variant: "destructive",
            duration: 5000
          });
        }
        
        // Добавляем информацию о retryAfter в ошибку
        const error = new Error(errorData.error || 'Слишком много запросов');
        (error as any).status = 429;
        (error as any).retryAfter = errorData.retryAfter;
        throw error;
      }
      
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Возвращаем JSON данные
    const data = await response.json();
    console.log('[correctApiRequest] Успешный ответ:', data);
    return data;
  } catch (error) {
    console.error('[correctApiRequest] Полная ошибка:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

export default correctApiRequest;