/**
 * Утилита для корректного выполнения API запросов с обработкой Telegram WebApp данных
 */

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  credentials?: RequestCredentials;
}

export async function correctApiRequest(url: string, method: string = 'GET', body?: any, headers: Record<string, string> = {}): Promise<any> {
  // Оборачиваем весь запрос в Promise.resolve для предотвращения unhandled rejections
  return Promise.resolve().then(async () => {
    const credentials = 'include';

    // Базовые заголовки
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers
    };

    // Добавляем guest_id из localStorage
    try {
      const guestId = localStorage.getItem('unifarm_guest_id');
      if (guestId) {
        requestHeaders['X-Guest-ID'] = guestId;
      }
    } catch (e) {
      // Игнорируем ошибки localStorage
    }

    // Добавляем Telegram WebApp данные если доступны
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
        requestHeaders['X-Telegram-Init-Data'] = window.Telegram.WebApp.initData;
      }
    } catch (e) {
      // Игнорируем ошибки Telegram WebApp
    }

    // Конфигурация запроса
    const requestConfig: RequestInit = {
      method,
      headers: requestHeaders,
      credentials
    };

    // Добавляем тело запроса для методов с данными
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        requestConfig.body = typeof body === 'string' ? body : JSON.stringify(body);
      } catch (e) {
        return {
          success: false,
          error: 'Ошибка сериализации данных запроса',
          data: null
        };
      }
    }

    try {
      const response = await fetch(url, requestConfig);
      
      // Проверяем статус ответа
      if (!response.ok) {
        let errorData;
        try {
          const errorText = await response.text();
          try {
            errorData = JSON.parse(errorText);
          } catch (parseError) {
            errorData = { error: 'Ошибка парсинга ответа сервера', status: response.status };
          }
        } catch (textError) {
          errorData = { error: 'Ошибка чтения ответа сервера', status: response.status };
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
        try {
          const data = JSON.parse(responseText);
          return data;
        } catch (parseError) {
          // Подавляем ошибку парсинга JSON в консоли для предотвращения спама
          return {
            success: false,
            error: 'Ошибка обработки ответа сервера',
            data: null,
            parseError: true
          };
        }
      } catch (textError) {
        return {
          success: false,
          error: 'Ошибка получения данных ответа',
          data: null
        };
      }
    } catch (networkError) {
      // Подавляем сетевые ошибки в консоли
      return {
        success: false,
        error: 'Ошибка сети или сервер недоступен',
        networkError: true
      };
    }
  }).catch((globalError) => {
    // Финальная обработка любых неперехваченных ошибок
    return {
      success: false,
      error: 'Критическая ошибка при выполнении запроса',
      criticalError: true
    };
  });
}

export default correctApiRequest;