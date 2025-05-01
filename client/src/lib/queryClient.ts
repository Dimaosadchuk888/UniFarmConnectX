import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getTelegramAuthHeaders } from "@/services/telegramService";
import apiConfig from "@/config/apiConfig";
import { fixRequestBody } from "./apiFix";

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
    console.log(`[QueryClient] Проблемный ответ (${res.status}): ${text.substring(0, 100)}...`);
    
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
 * НОВАЯ РЕАЛИЗАЦИЯ apiRequest С ПОДДЕРЖКОЙ ТОЛЬКО ОДНОГО ФОРМАТА:
 * apiRequest('/api/route', { method: 'POST', body: JSON.stringify(data) })
 * 
 * БОЛЬШЕ НЕ ПОДДЕРЖИВАЕТСЯ:
 * apiRequest('POST', '/api/route', data)
 * 
 * @param url API URL для запроса
 * @param options Опции fetch (метод, тело, заголовки и т.д.)
 * @returns Результат запроса в формате JSON
 */
export async function apiRequest(url: string, options?: RequestInit): Promise<any> {
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
  
  // Дополнительная проверка для отладки - нужна ли?
  if (options?.method === url) {
    console.error('[queryClient] Предупреждение: метод совпадает с URL, что может указывать на путаницу:', { url, method: options.method });
  }
  
  console.log('[queryClient] apiRequest to', url);

  try {
    // Нормализуем путь, если он не начинается со слеша
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    
    // Формируем полный URL с учетом протокола и хоста
    let fullUrl = '';
    
    // Определяем текущий протокол и хост из window.location
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const host = window.location.host;
      
      // Создаем абсолютный URL с учетом протокола
      fullUrl = `${protocol}//${host}${normalizedUrl}`;
      
      console.log('[queryClient] Сформирован абсолютный URL:', fullUrl);
    } else {
      // Запасной вариант, если window недоступен
      fullUrl = `https://uni-farm-connect-2-misterxuniverse.replit.app${normalizedUrl}`;
      console.log('[queryClient] Сформирован резервный URL:', fullUrl);
    }
    
    // Определяем метод из options или по умолчанию GET
    const method = options?.method || 'GET';
    console.log(`[queryClient] Выполняем ${method} запрос к: ${fullUrl}`);
    
    // Необходимые базовые заголовки
    const baseHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Объединяем базовые заголовки с переданными в options
    const customHeaders = options?.headers || {};
    const mergedHeaders = {
      ...baseHeaders,
      ...(customHeaders as Record<string, string>)
    };
    
    // Добавляем Telegram заголовки
    const apiHeaders = getApiHeaders(mergedHeaders);
    
    // Создаем чистые опции для fetch
    const fetchOptions: RequestInit = {
      method,
      credentials: 'include',
      headers: apiHeaders
    };
    
    // Копируем остальные опции (кроме headers, так как мы их уже объединили)
    if (options) {
      if (options.body) fetchOptions.body = options.body;
      if (options.cache) fetchOptions.cache = options.cache;
      if (options.mode) fetchOptions.mode = options.mode;
      if (options.redirect) fetchOptions.redirect = options.redirect;
      if (options.signal) fetchOptions.signal = options.signal;
    }
    
    // Проверка и логирование тела запроса
    if (fetchOptions.body) {
      console.log(`[queryClient] Request body: ${fetchOptions.body}`);
      
      // Детальная проверка формата body для POST/PUT запросов
      if (method === 'POST' || method === 'PUT') {
        try {
          // Проверяем, что тело - это строка в формате JSON
          let parsedBody = JSON.parse(fetchOptions.body as string);
          
          // Применяем исправление типов данных для запросов к API
          // Преобразует числовые amount в строковые для совместимости с сервером
          parsedBody = fixRequestBody(parsedBody);
          
          // Дополнительно проверяем, есть ли user_id в теле запроса
          // Если нет, и у нас есть информация о пользователе в localStorage, добавляем её
          if (!('user_id' in parsedBody)) {
            try {
              const userData = localStorage.getItem('unifarm_user_data');
              if (userData) {
                const userInfo = JSON.parse(userData);
                if (userInfo && userInfo.id) {
                  console.log(`[queryClient] Автоматически добавляем user_id=${userInfo.id} в тело запроса`);
                  parsedBody.user_id = userInfo.id;
                }
              }
            } catch (err) {
              console.warn('[queryClient] Не удалось получить ID пользователя из localStorage:', err);
            }
          }
          
          // Если тело запроса было изменено, обновляем его в fetchOptions
          const fixedBody = JSON.stringify(parsedBody);
          if (fixedBody !== fetchOptions.body) {
            console.log(`[queryClient] Тело запроса было исправлено для совместимости с сервером`);
            fetchOptions.body = fixedBody;
          }
          
          console.log(`[queryClient] Тело запроса (валидный JSON):`, parsedBody);
          
          // Если делаем запрос к фармингу, проверим структуру данных
          if (url.includes('/uni-farming/')) {
            console.log(`[queryClient] Проверка тела запроса фарминга:`, {
              hasAmount: 'amount' in parsedBody,
              amountType: typeof parsedBody.amount,
              hasUserId: 'user_id' in parsedBody,
              userIdType: typeof parsedBody.user_id
            });
          }
        } catch (e: any) {
          console.error(`[queryClient] ОШИБКА! Тело запроса не является валидным JSON:`, e);
          throw new Error(`Недопустимый формат JSON в запросе: ${e?.message || 'Неизвестная ошибка'}`);
        }
      }
    } else if (method === 'POST' || method === 'PUT') {
      console.warn(`[queryClient] ВНИМАНИЕ! ${method}-запрос без тела! URL: ${fullUrl}`);
    }
    
    console.log(`[queryClient] Отправляем запрос на ${method} ${fullUrl}`);
    
    // Выполняем запрос
    const response = await fetch(fullUrl, fetchOptions);
    
    console.log(`[queryClient] Response status: ${response.status} ${response.statusText}`);
    
    // Проверяем статус ответа
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }
    
    try {
      // Получаем текст ответа для проверки
      const responseText = await response.text();
      
      // Проверяем, что ответ не пустой
      if (!responseText || !responseText.trim()) {
        console.log('[queryClient] Получен пустой ответ');
        // Возвращаем базовый успешный ответ для пустого ответа
        return { 
          success: true,
          message: 'Операция успешно выполнена (пустой ответ)'
        };
      }
      
      // Проверяем, начинается ли текст с HTML тега
      if (responseText.trim().startsWith('<!DOCTYPE html>') || 
          responseText.trim().startsWith('<html') || 
          responseText.trim().match(/^<[!a-z]/i)) {
        console.error('[queryClient] Получен HTML-ответ вместо JSON:', responseText.substring(0, 100) + '...');
        return {
          success: false,
          error: 'Получен HTML-ответ вместо JSON. Возможно, сервер перенаправил на другую страницу.',
          type: 'html_response',
          isHtmlResponse: true
        };
      }
      
      try {
        // Преобразуем ответ в JSON
        const data = JSON.parse(responseText);
        
        // Логируем общую структуру ответа
        console.log(`[queryClient] Response received:`, {
          success: data?.success,
          hasData: data?.data !== undefined,
          dataType: data?.data ? (Array.isArray(data.data) ? 'array' : typeof data.data) : 'undefined'
        });
        
        return data;
      } catch (parseError: any) {
        console.error(`[queryClient] JSON parse error:`, parseError);
        console.log(`[queryClient] Raw response text:`, responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
        
        // Проверка на наличие признаков редиректа в тексте ответа
        if (responseText.includes('Redirecting to') || responseText.includes('301 Moved Permanently')) {
          console.warn('[queryClient] Обнаружен редирект в ответе. Это может вызывать проблемы с JSON-парсингом.');
          return { 
            success: false, 
            error: 'Сервер вернул редирект вместо JSON-ответа',
            type: 'redirect_response',
            isRedirect: true,
            rawResponse: responseText.substring(0, 300)
          };
        }
        
        // Для удобства отладки, возвращаем объект с сырым текстом ответа и сообщением об ошибке
        return { 
          success: false, 
          error: 'Недопустимый формат JSON в ответе',
          type: 'parse_error',
          rawResponse: responseText.substring(0, 1000),
          errorDetails: parseError?.message || 'Неизвестная ошибка'
        };
      }
    } catch (error: any) {
      console.error(`[queryClient] Response handling error:`, error);
      return {
        success: false,
        error: `Ошибка при обработке ответа: ${error?.message || 'Неизвестная ошибка'}`,
        type: 'response_handling_error'
      };
    }
  } catch (error) {
    console.error(`[queryClient] API request error to ${url}:`, error);
    throw error;
  }
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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Вспомогательная функция для правильного обновления запросов с учетом ID пользователя.
 * Использование:
 * invalidateQueryWithUserId('/api/uni-farming/info')
 * вместо
 * queryClient.invalidateQueries({ queryKey: ['/api/uni-farming/info'] })
 */
export function invalidateQueryWithUserId(endpoint: string): Promise<void> {
  try {
    // Пытаемся получить ID пользователя из localStorage
    const userData = localStorage.getItem('unifarm_user_data');
    if (userData) {
      const userInfo = JSON.parse(userData);
      if (userInfo && userInfo.id) {
        console.log(`[queryClient] Обновляем кэш для ${endpoint} с user_id=${userInfo.id}`);
        return queryClient.invalidateQueries({ queryKey: [endpoint, userInfo.id] });
      }
    }
  } catch (err) {
    console.warn('[queryClient] Не удалось получить ID пользователя из localStorage:', err);
  }
  
  // Если не удалось получить user_id, используем стандартный подход
  return queryClient.invalidateQueries({ queryKey: [endpoint] });
}
