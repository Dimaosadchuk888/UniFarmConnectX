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
      
      // Возвращаем объект ошибки вместо исключения для консистентности
      return {
        success: false,
        error: errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        errorData
      };
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
      
      // Возвращаем успешный объект с флагом ошибки вместо исключения
      // Это предотвращает крэш компонентов при некорректных ответах сервера
      return {
        success: false,
        error: 'Ошибка обработки ответа сервера',
        data: null,
        parseError: true
      };
    }
  } catch (error) {
    console.error('API Request Error:', error);
    
    // Возвращаем объект ошибки вместо исключения для стабильности
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка сети',
      networkError: true
    };
  }
}

export default correctApiRequest;