import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getTelegramAuthHeaders } from "@/services/telegramService";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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
  
  // Логируем наличие x-telegram-init-data заголовка (но не его содержимое)
  console.log('[queryClient] API headers prepared:', {
    hasTelegramData: 'x-telegram-init-data' in telegramHeaders,
    totalHeadersCount: Object.keys(headers).length
  });
  
  return headers;
}

// Обновляем тип apiRequest, чтобы он возвращал ответ с данными, а не Response
export async function apiRequest(
  url: string,
  options?: RequestInit
): Promise<any> {
  try {
    console.log(`[queryClient] apiRequest to ${url}`);
    
    // Добавляем заголовки Telegram к стандартным заголовкам
    const headers = getApiHeaders(options?.headers as Record<string, string> || {});
    
    // Логируем запрос перед отправкой
    console.log(`[queryClient] Making ${options?.method || 'GET'} request to: ${url}`);
    
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    // Логируем статус ответа
    console.log(`[queryClient] Response status: ${res.status} ${res.statusText}`);
    
    await throwIfResNotOk(res);
    
    // Пробуем распарсить JSON
    try {
      const data = await res.json();
      
      // Логируем общую структуру ответа (без раскрытия всех данных)
      console.log(`[queryClient] Response received:`, {
        success: data?.success,
        hasData: data?.data !== undefined,
        dataType: data?.data ? (Array.isArray(data.data) ? 'array' : typeof data.data) : 'undefined'
      });
      
      return data;
    } catch (error: any) {
      console.error(`[queryClient] JSON parse error:`, error);
      throw new Error(`Invalid JSON in response: ${error?.message || 'Unknown error'}`);
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
      const url = `${queryKeyStr}${queryKeyStr.includes('?') ? '&' : '?'}nocache=${timestamp}`;
      
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
