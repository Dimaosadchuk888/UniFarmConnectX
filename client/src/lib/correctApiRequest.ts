/**
 * Утилита для корректного выполнения API запросов с обработкой Telegram WebApp данных
 */

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  credentials?: RequestCredentials;
}

export async function correctApiRequest(url: string, method: string = 'GET', body?: any, headers: Record<string, string> = {}) {
  const credentials = 'include';

  // Базовые заголовки
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...headers
  };

  // Добавляем guest_id из localStorage
  const guestId = localStorage.getItem('unifarm_guest_id');
  if (guestId) {
    requestHeaders['X-Guest-ID'] = guestId;
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
    const response = await fetch(url, requestConfig);
    
    // Получаем текст ответа один раз
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Некорректный JSON ответ: ${responseText.substring(0, 100)}`);
    }
    
    // Специальная обработка для Vite прокси:
    // Если данные корректные (success: true), возвращаем их независимо от HTTP статуса
    if (responseData && responseData.success === true && responseData.data) {
      return responseData;
    }
    
    // Проверяем статус ответа только если данные некорректные
    if (!response.ok) {
      throw new Error(responseData.message || responseData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Возвращаем данные
    return responseData;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

export default correctApiRequest;