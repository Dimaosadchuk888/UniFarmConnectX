/**
 * Надежная утилита для корректной отправки запросов к API
 * Решает проблему с неправильным форматированием запросов
 */

import { fixRequestBody } from './apiFix';

/**
 * Выполняет безопасный запрос к API с правильными заголовками и обработкой ошибок
 * Решает проблему с неправильным форматом amount (конвертирует числа в строки)
 * 
 * @param endpoint - относительный путь эндпоинта, например '/api/uni-farming/deposit'
 * @param method - HTTP-метод (GET, POST, PUT, DELETE)
 * @param data - данные для отправки в теле запроса (для POST/PUT)
 * @returns Обещание с данными ответа или ошибкой
 */
export async function correctApiRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any
): Promise<T> {
  try {
    // Проверка формата endpoint
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }
    
    // Проверяем на наличие слеша в конце URL и удаляем его
    if (endpoint.endsWith('/') && endpoint.length > 1) {
      endpoint = endpoint.slice(0, -1);
      console.log(`[correctApiRequest] Удален завершающий слеш из URL:`, endpoint);
    }
    
    // Строим полный URL с учетом текущего хоста
    const protocol = window.location.protocol;
    const host = window.location.host;
    const fullUrl = `${protocol}//${host}${endpoint}`;
    
    console.log(`[correctApiRequest] Отправка ${method} запроса на ${fullUrl}`);
    
    // Создаем опции для fetch
    const options: RequestInit = {
      method: method, // Явно указываем метод
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      credentials: 'include'
    };
    
    // Добавляем тело запроса для POST и PUT
    if ((method === 'POST' || method === 'PUT') && data) {
      // Применяем исправление типов данных (number → string для amount)
      const fixedData = fixRequestBody(data);
      
      // Принудительно конвертируем amount в строку, если он существует
      if (fixedData && 'amount' in fixedData) {
        fixedData.amount = String(fixedData.amount);
        console.log('Тип:', typeof fixedData.amount, fixedData.amount);
      }
      
      // Детальное логирование
      console.log(`[correctApiRequest] Тело запроса до фиксации:`, JSON.stringify(data));
      console.log(`[correctApiRequest] Тело запроса после фиксации:`, JSON.stringify(fixedData));
      
      // Логирование для фарминга
      if (endpoint.includes('farming')) {
        if (fixedData.amount !== data.amount) {
          console.log(`[correctApiRequest] Преобразовано поле amount: ${data.amount} (${typeof data.amount}) → "${fixedData.amount}" (string)`);
        }
        
        console.log(`[correctApiRequest] Данные запроса фарминга:`, {
          endpoint,
          amount: fixedData.amount,
          amountType: typeof fixedData.amount,
          user_id: fixedData.user_id,
          userIdType: typeof fixedData.user_id
        });
      }
      
      // Преобразуем в JSON-строку
      options.body = JSON.stringify(fixedData);
    }
    
    // Детальное логирование для отладки
    console.log(`[correctApiRequest] Детали запроса:`, {
      url: fullUrl,
      method: options.method,
      headers: options.headers,
      hasBody: !!options.body
    });
    
    if (options.body) {
      console.log(`[correctApiRequest] Тело запроса:`, options.body);
    }
    
    // Выполняем запрос
    const response = await fetch(fullUrl, options);
    
    console.log(`[correctApiRequest] Статус ответа: ${response.status} ${response.statusText}`);
    
    // Проверяем HTTP-статус
    if (!response.ok) {
      // Получаем и анализируем текст ошибки
      const errorText = await response.text();
      console.error(`[correctApiRequest] Ошибка HTTP: ${response.status} ${response.statusText}`);
      console.error(`[correctApiRequest] Текст ошибки:`, errorText);
      throw new Error(`Ошибка ${response.status}: ${errorText || response.statusText}`);
    }
    
    // Получаем текст ответа
    const responseText = await response.text();
    console.log(`[correctApiRequest] Получен ответ (длина ${responseText.length} байт)`);
    
    // Проверка на пустой ответ
    if (!responseText || responseText.trim() === '') {
      console.log(`[correctApiRequest] Получен пустой ответ`);
      return { success: true } as T;
    }
    
    try {
      // Преобразуем в JSON
      const jsonData = JSON.parse(responseText);
      console.log(`[correctApiRequest] Успешный ответ:`, jsonData);
      return jsonData;
    } catch (parseError) {
      console.error(`[correctApiRequest] Ошибка парсинга JSON:`, parseError);
      console.error(`[correctApiRequest] Исходный текст:`, responseText.substring(0, 100) + '...');
      throw new Error(`Некорректный JSON в ответе: ${(parseError as Error).message}`);
    }
  } catch (error) {
    console.error(`[correctApiRequest] Ошибка запроса:`, error);
    throw error;
  }
}