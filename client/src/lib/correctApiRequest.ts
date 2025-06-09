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
    
    // Проверяем статус ответа
    if (!response.ok) {
      let errorData;
      try {
        const errorText = await response.text();
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        errorData = { error: 'Ошибка парсинга ответа сервера', status: response.status };
      }
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Пытаемся получить JSON ответ
    try {
      const responseText = await response.text();
      
      // Проверяем, что ответ не пустой
      if (!responseText || responseText.trim() === '') {
        return {
          success: false,
          error: 'Пустой ответ от сервера',
          data: null
        };
      }
      
      // Парсим JSON
      const data = JSON.parse(responseText);
      return data;
    } catch (parseError) {
      console.error('[correctApiRequest] Ошибка парсинга JSON:', parseError);
      return {
        success: false,
        error: 'Ошибка обработки ответа сервера',
        data: null
      };
    }
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

export default correctApiRequest;