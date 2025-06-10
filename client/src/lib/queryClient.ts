import { QueryClient, QueryFunction, QueryCache, MutationCache } from "@tanstack/react-query";
import { getTelegramAuthHeaders } from "@/services/telegramService";
import apiConfig from "@/config/apiConfig";

/**
 * Вспомогательная функция для проверки статуса HTTP-ответа
 * Не выбрасывает исключения, только возвращает объекты ошибок
 */
async function checkResponseStatus(res: Response): Promise<{ success: boolean; error?: any; data?: any }> {
  if (!res.ok) {
    try {
      const text = await res.text();

      // Проверяем на HTML-ответ (серверные ошибки часто возвращают HTML)
      const trimmedText = text.trim();
      const isHtmlResponse = trimmedText.startsWith('<!DOCTYPE html>') || 
                            trimmedText.startsWith('<html') || 
                            /^<[!a-z]/i.test(trimmedText);

      // Проверяем на редирект в тексте
      const isRedirect = text.includes('Redirecting to') || 
                        text.includes('301 Moved Permanently') ||
                        text.includes('302 Found');

      // Анализируем данные ошибки, если это JSON
      let errorData;
      try {
        errorData = JSON.parse(text);
      } catch (e) {
        if (isHtmlResponse) {
          errorData = { 
            error: 'Получен HTML-ответ вместо JSON', 
            isHtmlResponse: true,
            type: 'html_response'
          };
        } else if (isRedirect) {
          errorData = { 
            error: 'Сервер вернул редирект', 
            isRedirect: true,
            type: 'redirect_response'
          };
        } else {
          errorData = { 
            error: text || res.statusText || 'Неопределенная ошибка',
            type: 'unknown'
          };
        }
      }

      // Возвращаем объект с ошибкой
      return {
        success: false,
        error: {
          message: `${res.status}: ${errorData.message || errorData.error || "Неизвестная ошибка"}`,
          status: res.status,
          statusText: res.statusText,
          errorData: errorData,
          isHtmlResponse: isHtmlResponse,
          isRedirect: isRedirect
        }
      };
    } catch (e) {
      return {
        success: false,
        error: {
          message: `HTTP ${res.status}: ${res.statusText}`,
          status: res.status,
          statusText: res.statusText,
          criticalError: true
        }
      };
    }
  }
  
  return { success: true };
}

// Получает все необходимые заголовки для запросов к API
function getApiHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  console.log('[queryClient] Getting API headers');

  // Получаем заголовки с данными Telegram
  const telegramHeaders = getTelegramAuthHeaders();

  // Базовые заголовки для API запросов
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    ...telegramHeaders, // Добавляем заголовки Telegram
    ...customHeaders    // Добавляем пользовательские заголовки
  };

  // Логируем наличие telegram-заголовков (но не их содержимое)
  console.log('[queryClient] API headers prepared:', {
    hasTelegramData: 'Telegram-Data' in telegramHeaders || 'X-Telegram-Data' in telegramHeaders || 'x-telegram-init-data' in telegramHeaders,
    hasTelegramUserId: 'X-Telegram-User-Id' in telegramHeaders,
    telegramHeadersCount: Object.keys(telegramHeaders).length,
    totalHeadersCount: Object.keys(headers).length
  });

  return headers;
}

/**
 * Унифицированный метод для всех API-запросов в проекте
 * РЕКОМЕНДУЕМЫЙ ФОРМАТ ИСПОЛЬЗОВАНИЯ:
 * apiRequest('/api/route', { method: 'POST', body: JSON.stringify(data) })
 * 
 * УСТАРЕВШИЙ ФОРМАТ (поддерживается для обратной совместимости, но не рекомендуется):
 * apiRequest('POST', '/api/route', data)
 * 
 * @param url API URL для запроса
 * @param options Опции fetch (метод, тело, заголовки и т.д.)
 * @returns Результат запроса в формате JSON
 */
export async function apiRequest(url: string, options?: RequestInit): Promise<any> {
  // Используем correctApiRequest для унифицированных запросов
  const correctApiRequest = (await import('./correctApiRequest')).default;

  console.log('[queryClient] apiRequest to', url);

  // Проверка наличия URL и валидация
  if (!url || typeof url !== 'string') {
    console.error('[queryClient] Ошибка: отсутствует или некорректный URL для запроса', { url });
    // Возвращаем объект с ошибкой вместо исключения
    return {
      success: false,
      error: 'Отсутствует или некорректный URL для запроса API'
    };
  }

  // Проверка, если URL передан как HTTP метод (возможная ошибка)
  if (url === 'POST' || url === 'GET' || url === 'PUT' || url === 'DELETE') {
    console.error('[queryClient] Ошибка: в качестве URL передан HTTP метод:', url);
    return {
      success: false,
      error: `Некорректный URL: получен HTTP метод ${url} вместо адреса`
    };
  }

  // Извлекаем метод из options или используем GET по умолчанию
  const method = options?.method || 'GET';

  // Преобразуем body в правильный формат
  let body: any;

  if (options?.body) {
    try {
      // Проверяем, является ли body строкой в формате JSON
      if (typeof options.body === 'string') {
        body = JSON.parse(options.body);
      } else {
        body = options.body;
      }
    } catch {
      // Если не удалось спарсить JSON, используем как есть
      body = options.body;
    }
  }

  // Используем унифицированный correctApiRequest
  return await correctApiRequest(url, method, body);
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log("[DEBUG] QueryClient - Requesting:", queryKey[0]);

    try {
      // Добавляем заголовки, чтобы избежать кэширования
      const timestamp = new Date().getTime();
      const queryKeyStr = queryKey[0] as string;

      // Преобразуем относительный URL в полный с использованием apiConfig
      let baseUrl = apiConfig.getFullUrl(queryKeyStr);

      // Проверяем, есть ли второй элемент в queryKey (userId) и добавляем его в URL
      let userId = null;

      // Сначала пытаемся получить ID из queryKey (2й элемент)
      if (queryKey.length > 1 && queryKey[1]) {
        userId = queryKey[1];
      } 
      // Если ID не передан в queryKey, пытаемся получить из localStorage
      else {
        try {
          const userData = localStorage.getItem('unifarm_user_data');
          if (userData) {
            const userInfo = JSON.parse(userData);
            if (userInfo && userInfo.id) {
              userId = userInfo.id;
            }
          }
        } catch (err) {
          console.warn('[queryClient] Не удалось получить ID пользователя из localStorage:', err);
        }
      }

      // Если у нас есть userId и URL еще не содержит user_id, добавляем его
      if (userId && !baseUrl.includes('user_id=')) {
        const separator = baseUrl.includes('?') ? '&' : '?';
        baseUrl = `${baseUrl}${separator}user_id=${userId}`;
        console.log("[DEBUG] QueryClient - Added userId to URL:", userId);
      }

      // Добавляем nocache параметр
      const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}nocache=${timestamp}`;

      console.log("[DEBUG] QueryClient - Full URL:", url);

      // Получаем заголовки с данными Telegram
      const headers = getApiHeaders();

      const res = await fetch(url, {
        credentials: "include",
        headers
      });

      // Уменьшаем количество отладочной информации
      if (process.env.NODE_ENV === 'development') {
        console.log("[DEBUG] QueryClient - Response status:", res.status);
      }

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log("[DEBUG] QueryClient - Returning null due to 401");
        return null;
      }

      // Проверяем статус ответа без выброса исключений
      if (!res.ok) {
        const text = await res.text();
        const isHtmlResponse = res.headers.get('content-type')?.includes('text/html');
        
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch (e) {
          errorData = { 
            error: text || res.statusText || 'Неопределенная ошибка',
            type: isHtmlResponse ? 'html_response' : 'unknown'
          };
        }

        return {
          success: false,
          error: `${res.status}: ${errorData.message || errorData.error || "Неизвестная ошибка"}`,
          status: res.status,
          statusText: res.statusText,
          errorData: errorData
        };
      }

      try {
        // Получаем текст ответа и проверяем его валидность как JSON
        const text = await res.text();

        try {
          const data = JSON.parse(text);
          
          // Дополнительная валидация для безопасности
          if (data && typeof data === 'object') {
            return data;
          } else {
            console.warn("[DEBUG] QueryClient - Неожиданный формат данных:", data);
            return data;
          }
        } catch (error: any) {
          console.error("[DEBUG] QueryClient - JSON parse error:", error.message || error);
          console.error("[DEBUG] QueryClient - Response text length:", text.length);
          
          // Проверяем, не является ли это пустым ответом
          if (!text || text.trim() === '') {
            return {
              success: false,
              error: "Пустой ответ от сервера",
              data: null
            };
          }
          
          // Возвращаем структуру с ошибкой вместо пустых данных
          return {
            success: false,
            error: "Ошибка парсинга ответа сервера",
            data: null,
            rawText: text.substring(0, 100) // Первые 100 символов для отладки
          };
        }
      } catch (resError) {
        console.error("[DEBUG] QueryClient - Response error:", resError);
        return {
          success: false,
          error: `Response error: ${(resError as any).message || 'Unknown response error'}`,
          status: (resError as any).status || 500
        };
      }
    } catch (fetchError) {
      console.error("[DEBUG] QueryClient - Fetch error:", fetchError);
      return {
        success: false,
        error: `Fetch error: ${(fetchError as any).message || 'Network error'}`,
        status: (fetchError as any).status || 0
      };
    }
  };

/**
 * Глобальный обработчик ошибок для React Query
 * Позволяет централизованно обрабатывать и логировать ошибки запросов
 */
const globalQueryErrorHandler = (error: unknown) => {
  // Логируем ошибку
  console.error('[QueryClient] Глобальная ошибка запроса:', error);

  // Анализируем тип ошибки
  if (error instanceof Error) {
    // Получаем дополнительные метаданные, если они есть
    const status = (error as any).status;
    const statusText = (error as any).statusText;
    const errorData = (error as any).errorData;

    // Логируем детали для диагностики
    console.error(`[QueryClient] Ошибка ${status || 'неизвестный статус'}: ${statusText || error.message}`);

    if (errorData) {
      console.error('[QueryClient] Данные ошибки:', errorData);
    }

    // Обработка по типу HTTP-статуса
    if (status === 401) {
      console.warn('[QueryClient] Пользователь не авторизован (401)');
      // Здесь могла бы быть логика перенаправления на страницу логина
    } else if (status === 403) {
      console.warn('[QueryClient] Доступ запрещен (403)');
    } else if (status === 404) {
      console.warn('[QueryClient] Ресурс не найден (404)');
    } else if (status >= 500) {
      console.error('[QueryClient] Серверная ошибка:', error.message);
    }
  } else {
    // Если это не экземпляр Error, логируем как есть
    console.error('[QueryClient] Неизвестная ошибка:', error);
  }

  // Возвращаем ошибку для дальнейшей обработки
  return error;
};

// Создаем кэши с обработчиками ошибок
const queryCache = new QueryCache({
  onError: (error, query) => {
    // Подавляем логирование ошибок в production для предотвращения спама в консоли
    if (process.env.NODE_ENV === 'development') {
      console.warn('[QueryClient] Query error for key:', query.queryKey, error);
    }
    // Не выбрасываем ошибку дальше
  }
});

const mutationCache = new MutationCache({
  onError: (error, variables, context, mutation) => {
    // Подавляем логирование ошибок в production для предотвращения спама в консоли
    if (process.env.NODE_ENV === 'development') {
      console.warn('[QueryClient] Mutation error:', error);
    }
    // Не выбрасываем ошибку дальше
  }
});

// Создаем экземпляр QueryClient с настроенными кэшами
// Дедупликация запросов для предотвращения спама
const pendingQueries = new Map<string, Promise<any>>();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 минут кеширование вместо Infinity
      gcTime: 10 * 60 * 1000, // 10 минут хранение в кеше (gcTime заменяет cacheTime в React Query v5)
      retry: false, // Отключаем повторы для предотвращения каскадных ошибок
      retryDelay: 1000, // 1 секунда задержка между попытками
    },
    mutations: {
      retry: false, // Отключаем повторы для мутаций
      retryDelay: 1000,
    },
  },
  queryCache,
  mutationCache,
});

/**
 * Вспомогательная функция для правильного обновления запросов с учетом ID пользователя.
 * Использование:
 * invalidateQueryWithUserId('/api/uni-farming/info')
 * вместо
 * queryClient.invalidateQueries({ queryKey: ['/api/uni-farming/info'] })
 * 
 * Улучшенная версия с поддержкой обновления нескольких ключей и защитой от кеширования.
 */
export function invalidateQueryWithUserId(endpoint: string, additionalEndpoints: string[] = []): Promise<void> {
  // Создаем массив всех endpoint для обновления
  const allEndpoints = [endpoint, ...additionalEndpoints];

  // Добавляем базовые конечные точки, которые всегда нужно обновлять при изменении состояния
  const criticalEndpoints = ['/api/me', '/api/wallet/balance'];
  for (const criticalEndpoint of criticalEndpoints) {
    if (!allEndpoints.includes(criticalEndpoint)) {
      allEndpoints.push(criticalEndpoint);
    }
  }

  try {
    // Пытаемся получить ID пользователя из localStorage
    const userData = localStorage.getItem('unifarm_user_data');
    let userId = null;

    if (userData) {
      try {
        const userInfo = JSON.parse(userData);
        if (userInfo && userInfo.id) {
          userId = userInfo.id;
        }
      } catch (parseError) {
        console.warn('[queryClient] Ошибка при парсинге данных пользователя:', parseError);
      }
    }

    // Массив промисов для обновления кеша всех эндпоинтов
    const invalidationPromises = allEndpoints.map(endpointUrl => {
      console.log(`[queryClient] Обновляем кэш для ${endpointUrl}${userId ? ` с user_id=${userId}` : ''}`);

      // Если у нас есть ID пользователя, обновляем оба варианта queryKey
      if (userId) {
        return Promise.all([
          queryClient.invalidateQueries({ queryKey: [endpointUrl, userId] }),
          queryClient.invalidateQueries({ queryKey: [endpointUrl] })
        ]);
      }

      // Иначе обновляем только базовый queryKey
      return queryClient.invalidateQueries({ queryKey: [endpointUrl] });
    });

    // Ждем завершения всех операций обновления кеша
    return Promise.all(invalidationPromises).then(() => undefined);
  } catch (err) {
    console.warn('[queryClient] Ошибка при обновлении кеша запросов:', err);

    // В случае ошибки обновляем все запросы без userId
    return Promise.all(
      allEndpoints.map(endpointUrl => 
        queryClient.invalidateQueries({ queryKey: [endpointUrl] })
      )
    ).then(() => undefined);
  }
}