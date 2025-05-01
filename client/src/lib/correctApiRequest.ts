import { fixRequestBody } from './apiFix';

export async function correctApiRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any
): Promise<T> {
  try {
    // Корректировка endpoint
    if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;
    if (endpoint.endsWith('/') && endpoint.length > 1) {
      endpoint = endpoint.slice(0, -1);
      console.log(`[correctApiRequest] Удален завершающий слеш из URL:`, endpoint);
    }

    const protocol = window.location.protocol;
    const host = window.location.host;
    const fullUrl = `${protocol}//${host}${endpoint}`;
    console.log(`[correctApiRequest] Отправка ${method} запроса на ${fullUrl}`);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const body = data ? JSON.stringify(fixRequestBody(data)) : undefined;

    const response = await fetch(fullUrl, {
      method,
      headers,
      body,
      credentials: 'include'
    });

    // Логируем статус
    console.log(`[correctApiRequest] Статус: ${response.status} ${response.statusText}`);

    // Пробуем распарсить JSON
    try {
      const json = await response.json();
      return json;
    } catch (jsonError) {
      const text = await response.text();
      console.warn('[correctApiRequest] Ответ не является JSON:', text);
      throw new Error(`Ошибка разбора JSON. Ответ сервера: ${text}`);
    }
  } catch (error: any) {
    console.error('[correctApiRequest] Ошибка запроса:', error.message || error);
    throw error;
  }
}