import { QueryClient, QueryFunction, QueryCache, MutationCache } from "@tanstack/react-query";
import { getTelegramAuthHeaders } from "@/services/telegramService";
import apiConfig from "@/config/apiConfig";
import { fixRequestBody } from "./apiFix";
import frontendLogger from "../utils/frontendLogger";

/**
 * Вспомогательная функция для проверки статуса HTTP-ответа
 * Если ответ не OK (не 2xx), бросает исключение с текстом ответа
 * Добавлена продвинутая диагностика для обнаружения редиректов и HTML-ответов
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();

    // Проверяем на HTML-ответ (серверные ошибки часто возвращают HTML)
    const isHtmlResponse = text.trim().startsWith('<!DOCTYPE html>') || 
                          text.trim().startsWith('<html') || 
                          text.trim().match(/^<[!a-z]/i);

    // Проверяем на редирект в тексте
    const isRedirect = text.includes('Redirecting to') || 
                      text.includes('301 Moved Permanently') ||
                      text.includes('302 Found');

    // Для отладки логируем первые байты ответа
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

    const error = new Error(`${res.status}: ${errorData.message || errorData.error || "Неизвестная ошибка"}`);
    (error as any).status = res.status;
    (error as any).statusText = res.statusText;
    (error as any).errorData = errorData;
    (error as any).isHtmlResponse = isHtmlResponse;
    (error as any).isRedirect = isRedirect;

    throw error;
  }
}

// Получает все необходимые заголовки для запросов к API
function getApiHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  // Получаем заголовки с данными Telegram
  const telegramHeaders = getTelegramAuthHeaders();

  // Добавляем guest_id из localStorage если нет Telegram данных
  const guestId = localStorage.getItem('unifarm_guest_id');
  if (guestId && !telegramHeaders['X-Telegram-Init-Data']) {
    telegramHeaders['X-Guest-Id'] = guestId;
  }

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
  // Импортируем улучшенный apiService
  const { apiService } = await import('./apiService');
  
  // Проверка наличия URL и валидация
  if (!url || typeof url !== 'string') {
    // Возвращаем объект с ошибкой вместо исключения
    return {
      success: false,
      error: 'Отсутствует или некорректный URL для запроса API'
    };
  }

  // Проверка, если URL передан как HTTP метод (возможная ошибка)
  if (url === 'POST' || url === 'GET' || url === 'PUT' || url === 'DELETE') {
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

  // Используем унифицированный apiService
  return await apiService(url, {
    method: method as any,
    body,
    headers: options?.headers as Record<string, string>
  });
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
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
        } catch (err) {}
      }

      // Если у нас есть userId и URL еще не содержит user_id, добавляем его
      if (userId && !baseUrl.includes('user_id=')) {
        const separator = baseUrl.includes('?') ? '&' : '?';
        baseUrl = `${baseUrl}${separator}user_id=${userId}`;
      }

      // Добавляем nocache параметр
      const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}nocache=${timestamp}`;
      
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

      try {
        await throwIfResNotOk(res);

        // Получаем текст ответа и проверяем его валидность как JSON
        const text = await res.text();

        try {
          const data = JSON.parse(text);
          return data;
        } catch (error: any) {
          console.error("[DEBUG] QueryClient - JSON parse error:", error);
          // Если JSON невалидный, возвращаем пустой массив для защиты от ошибок
          return Array.isArray(queryKey[0]) ? [] : {};
        }
      } catch (resError) {
        console.error("[DEBUG] QueryClient - Response error:", resError);
        throw resError;
      }
    } catch (fetchError) {
      console.error("[DEBUG] QueryClient - Fetch error:", fetchError);
      throw fetchError;
    }
  };

/**
 * Безопасный глобальный обработчик ошибок для React Query
 * Предотвращает краш приложения при ошибках авторизации
 */
function safeQueryErrorHandler(error: any) {
  try {
    console.error('[QueryClient] Глобальная ошибка запроса:', error);
    
    if (error?.status === 401) {
      console.log('[QueryClient] Ошибка авторизации - продолжаем работу в демо режиме');
      return;
    }
    
    if (error?.status) {
      console.log(`[QueryClient] Ошибка HTTP ${error.status}: ${error.statusText || 'Unknown'}`);
    } else {
      console.log('[QueryClient] Ошибка неизвестный статус:', error.message || error);
    }
  } catch (handlerError) {
    console.error('[QueryClient] Критическая ошибка в обработчике:', handlerError);
  }
}
const globalQueryErrorHandler = (error: unknown) => {
  // Анализируем тип ошибки
  if (error instanceof Error) {
    const status = (error as any).status;
    const statusText = (error as any).statusText;
    const errorData = (error as any).errorData;

    // Обработка ошибок авторизации без краша
    if (status === 401) {
      console.warn("[QueryClient] Пользователь не авторизован (401)");
      // Возвращаем null вместо ошибки для предотвращения краша
      return null;
    } else if (status === 403) {
      console.warn("[QueryClient] Доступ запрещен (403)");
      return null;
    } else if (status === 404) {
      console.warn("[QueryClient] Ресурс не найден (404)");
      return null;
    } else if (status >= 500) {
      console.error("[QueryClient] Серверная ошибка (5xx):", status);
      return null;
    }
    
    // Для других ошибок логируем минимально
    console.error(`[QueryClient] Ошибка неизвестный статус: HTTP ${status}: ${statusText || "Unauthorized"}`);
  }

  // Возвращаем null для предотвращения краша
  return null;
};

// Создаем кэши с обработчиками ошибок
const queryCache = new QueryCache({
  onError: globalQueryErrorHandler
});

const mutationCache = new MutationCache({
  onError: globalQueryErrorHandler
});

// Создаем экземпляр QueryClient с настроенными кэшами
// Дедупликация запросов для предотвращения спама
const pendingQueries = new Map<string, Promise<any>>();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: false, // Отключаем retry для предотвращения спама
      retryDelay: 1000,
      throwOnError: false, // Не бросаем ошибки в компонентах
    },
    mutations: {
      retry: false, // Отключаем retry для мутаций
      retryDelay: 1000,
      throwOnError: false,
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
      } catch (parseError) {}
    }

    // Массив промисов для обновления кеша всех эндпоинтов
    const invalidationPromises = allEndpoints.map(endpointUrl => {
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
    console.warn('[invalidateQueryWithUserId] Ошибка при обновлении кеша:', err);
    // В случае ошибки обновляем все запросы без userId
    return Promise.all(
      allEndpoints.map(endpointUrl => 
        queryClient.invalidateQueries({ queryKey: [endpointUrl] })
      )
    ).then(() => undefined);
  }
}

// Экспортируем queryClient как default и именованный экспорт
export { queryClient };
export default queryClient;