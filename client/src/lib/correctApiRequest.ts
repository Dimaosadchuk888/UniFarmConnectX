/**
 * Утилита для корректного выполнения API запросов с обработкой Telegram WebApp данных
 * и автоматическим обновлением JWT токенов
 */

import { toast } from '@/hooks/use-toast';
import { handleTokenRefresh, isTokenExpiredError, isTokenExpiringSoon } from './tokenRefreshHandler';

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  credentials?: RequestCredentials;
  retryCount?: number;
}

// Хранилище для предотвращения спама уведомлениями о rate limit
let lastRateLimitToastTime = 0;
const RATE_LIMIT_TOAST_COOLDOWN = 10000; // 10 секунд между уведомлениями

// Максимальное количество попыток при ошибке авторизации
const MAX_AUTH_RETRIES = 2;

async function makeRequestWithAuth(url: string, config: RequestConfig): Promise<Response> {
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...config.headers
  };

  // Получаем токен из localStorage
  let token = localStorage.getItem('unifarm_jwt_token');
  
  // Проверяем, не истекает ли токен скоро (за 1 час до истечения)
  if (token && isTokenExpiringSoon(token)) {
    console.log('[correctApiRequest] Токен скоро истечет, обновляем заранее...');
    const refreshResult = await handleTokenRefresh();
    if (refreshResult.success && refreshResult.token) {
      token = refreshResult.token;
    }
  }
  
  // Добавляем токен в заголовки если он есть
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
    console.log('[correctApiRequest] JWT токен добавлен, длина:', token.length);
  } else {
    console.warn('[correctApiRequest] ⚠️ Токен отсутствует, запрос будет выполнен без авторизации');
  }

  // Добавляем Telegram WebApp данные если доступны
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
    requestHeaders['X-Telegram-Init-Data'] = window.Telegram.WebApp.initData;
  }

  // Конфигурация запроса
  const requestConfig: RequestInit = {
    method: config.method || 'GET',
    headers: requestHeaders,
    credentials: config.credentials || 'include'
  };

  // Добавляем тело запроса для методов с данными
  if (config.body && ['POST', 'PUT', 'PATCH'].includes(requestConfig.method!)) {
    requestConfig.body = typeof config.body === 'string' ? config.body : JSON.stringify(config.body);
  }

  return fetch(url, requestConfig);
}

export async function correctApiRequest(
  url: string, 
  method: string = 'GET', 
  body?: any, 
  headers: Record<string, string> = {},
  retryCount: number = 0
) {
  const config: RequestConfig = {
    method,
    headers,
    body,
    credentials: 'include',
    retryCount
  };

  try {
    console.log('[correctApiRequest] Отправка запроса:', {
      url,
      method,
      body,
      retryCount
    });
    
    const response = await makeRequestWithAuth(url, config);
    
    console.log('[correctApiRequest] Получен ответ:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    });
    
    // Проверяем статус ответа
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[correctApiRequest] Ошибка ответа:', errorData);
      
      // Обработка 401 - Unauthorized (автоматическое обновление токена)
      if (response.status === 401 && retryCount < MAX_AUTH_RETRIES) {
        console.log('[correctApiRequest] 🔄 Получена ошибка 401, пытаемся обновить токен...');
        
        // Пытаемся обновить токен
        const refreshResult = await handleTokenRefresh();
        
        if (refreshResult.success) {
          console.log('[correctApiRequest] ✅ Токен успешно обновлен, повторяем запрос...');
          
          // Показываем пользователю что токен обновляется
          toast({
            title: "Обновляем токен авторизации...",
            variant: "default",
            duration: 2000
          });
          
          // Повторяем запрос с новым токеном
          return correctApiRequest(url, method, body, headers, retryCount + 1);
        } else {
          console.error('[correctApiRequest] ❌ Не удалось обновить токен:', refreshResult.error);
          console.log('[correctApiRequest] 🚫 ОТМЕНЯЕМ автоматическую перезагрузку для предотвращения цикла');
          // НЕ перезагружаем страницу - это вызывает бесконечный цикл!
          // Возвращаем ошибку чтобы компоненты могли обработать
          const error = new Error('Authentication required');
          (error as any).status = 401;
          (error as any).needAuth = true;
          throw error;
        }
      }
      
      // Обработка 429 - Too Many Requests
      if (response.status === 429) {
        const currentTime = Date.now();
        
        // Проверяем, нужно ли показывать toast (не более 1 раза в 10 секунд)
        if (currentTime - lastRateLimitToastTime > RATE_LIMIT_TOAST_COOLDOWN) {
          lastRateLimitToastTime = currentTime;
          
          // Показываем уведомление пользователю
          toast({
            title: "Попробуйте через несколько секунд",
            description: "Слишком много запросов",
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
      
      // Обработка серверных ошибок 5xx
      if (response.status >= 500) {
        toast({
          title: "Временные проблемы с сервером",
          description: "Мы работаем над решением проблемы",
          variant: "destructive"
        });
      }
      
      // Добавляем дополнительную информацию к ошибке
      const error = new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      Object.assign(error, errorData);
      throw error;
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
    
    // Обработка сетевых ошибок
    if (error instanceof Error && error.name === 'TypeError' && error.message.includes('fetch')) {
      toast({
        title: "Проверьте подключение к интернету",
        description: "Не удалось связаться с сервером",
        variant: "destructive"
      });
    }
    
    throw error;
  }
}

export default correctApiRequest;