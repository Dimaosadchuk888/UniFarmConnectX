import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log("[DEBUG] QueryClient - Requesting:", queryKey[0]);
    
    try {
      // Добавляем заголовок Accept для явного указания JSON
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers: {
          "Accept": "application/json"
        }
      });

      console.log("[DEBUG] QueryClient - Response status:", res.status);
      console.log("[DEBUG] QueryClient - Response headers:", 
        Object.fromEntries(res.headers.entries()));

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log("[DEBUG] QueryClient - Returning null due to 401");
        return null;
      }

      try {
        await throwIfResNotOk(res);
        
        // Получаем текст ответа и проверяем его валидность как JSON
        const text = await res.text();
        console.log("[DEBUG] QueryClient - Response text (first 100 chars):", 
          text.substring(0, 100));
        
        try {
          const data = JSON.parse(text);
          console.log("[DEBUG] QueryClient - JSON parsed successfully");
          return data;
        } catch (parseError) {
          console.error("[DEBUG] QueryClient - JSON parse error:", parseError);
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
