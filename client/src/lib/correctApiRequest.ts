import { fixRequestBody } from './apiFix';
import sessionRestoreService from '../services/sessionRestoreService';

/**
 * Улучшенная функция для выполнения API-запросов с надежной обработкой ошибок
 * @param endpoint URL эндпоинта API
 * @param method HTTP метод запроса
 * @param data Данные для отправки (для POST, PUT)
 * @returns Результат API запроса
 */
export async function correctApiRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any
): Promise<T> {
  let fullUrl = '';
  let requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  
  try {
    // Проверка корректности входных данных
    if (endpoint === undefined || endpoint === null) {
      console.error(`[correctApiRequest] [${requestId}] Endpoint не может быть undefined или null`);
      throw new Error('API endpoint не указан');
    }
    
    if (typeof endpoint !== 'string') {
      console.error(`[correctApiRequest] [${requestId}] Некорректный тип endpoint:`, typeof endpoint);
      throw new Error(`API endpoint должен быть строкой, получен: ${typeof endpoint}`);
    }
    
    // Корректировка endpoint
    try {
      if (!endpoint.startsWith('/')) {
        endpoint = '/' + endpoint;
        console.log(`[correctApiRequest] [${requestId}] Добавлен начальный слеш к URL:`, endpoint);
      }
      
      if (endpoint.endsWith('/') && endpoint.length > 1) {
        endpoint = endpoint.slice(0, -1);
        console.log(`[correctApiRequest] [${requestId}] Удален завершающий слеш из URL:`, endpoint);
      }
    } catch (endpointError) {
      console.error(`[correctApiRequest] [${requestId}] Ошибка при корректировке endpoint:`, endpointError);
      // Продолжаем выполнение с исходным endpoint
    }

    // Формирование полного URL
    try {
      const protocol = window.location.protocol || 'https:';
      const host = window.location.host || '';
      
      if (!host) {
        console.warn(`[correctApiRequest] [${requestId}] Не удалось получить host из window.location`);
      }
      
      // Получаем userId из localStorage чтобы передать его в запросах
      const lastSessionStr = localStorage.getItem('unifarm_last_session');
      let userId = null;
      if (lastSessionStr) {
        try {
          const lastSession = JSON.parse(lastSessionStr);
          userId = lastSession.user_id;
        } catch (e) {
          console.warn(`[correctApiRequest] [${requestId}] Ошибка при извлечении userId из localStorage:`, e);
        }
      }
      
      // Добавляем userId ко всем запросам кроме /session и если это не GET с уже имеющимся user_id
      if (userId && !endpoint.includes('/session') && 
          !(method === 'GET' && endpoint.includes('user_id='))) {
        const separator = endpoint.includes('?') ? '&' : '?';
        endpoint = `${endpoint}${separator}user_id=${userId}`;
        console.log(`[correctApiRequest] [${requestId}] Добавлен user_id=${userId} к запросу`);
      }
      
      fullUrl = `${protocol}//${host}${endpoint}`;
      console.log(`[correctApiRequest] [${requestId}] Отправка ${method} запроса на ${fullUrl}`);
    } catch (urlError) {
      console.error(`[correctApiRequest] [${requestId}] Ошибка при формировании URL:`, urlError);
      fullUrl = endpoint; // Используем относительный URL как запасной вариант
    }

    // Формирование заголовков
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    
    // Добавляем заголовки разработчика, если находимся в режиме разработки
    if (process.env.NODE_ENV !== 'production') {
      // Импортируем здесь для избежания циклических импортов
      const sessionStorageService = require('../services/sessionStorageService').default;
      
      // Получаем userId через новый сервис
      let userId = null;
      try {
        userId = sessionStorageService.getUserId();
      } catch (e) {
        console.warn(`[correctApiRequest] [${requestId}] Ошибка при получении userId через сервис:`, e);
        
        // Запасной способ получения userId
        const lastSessionStr = localStorage.getItem('unifarm_last_session');
        if (lastSessionStr) {
          try {
            const lastSession = JSON.parse(lastSessionStr);
            userId = lastSession.user_id;
          } catch (e) {
            console.warn(`[correctApiRequest] [${requestId}] Ошибка при извлечении userId из localStorage:`, e);
          }
        }
      }
      
      // Получаем guest_id через сервис
      let guestId = null;
      try {
        guestId = sessionStorageService.getGuestId();
      } catch (e) {
        console.warn(`[correctApiRequest] [${requestId}] Ошибка при получении guestId через сервис:`, e);
      }
      
      // Для разработки добавляем специальные заголовки
      headers['x-development-mode'] = 'true';
      
      // Добавляем user_id, если он есть
      if (userId) {
        headers['x-development-user-id'] = userId.toString();
        headers['x-telegram-user-id'] = userId.toString();
        console.log(`[correctApiRequest] [${requestId}] Добавлены заголовки разработки с user_id=${userId}`);
      } else {
        // Запасной вариант для режима разработки - используем ID 1
        headers['x-development-user-id'] = '1';
        headers['x-telegram-user-id'] = '1';
        console.log(`[correctApiRequest] [${requestId}] Добавлены заголовки разработки с запасным user_id=1`);
      }
      
      // Добавляем guest_id, если он есть
      if (guestId) {
        headers['x-development-guest-id'] = guestId;
        console.log(`[correctApiRequest] [${requestId}] Добавлен заголовок с guest_id=${guestId}`);
      }
    }

    // Безопасная обработка тела запроса
    let body: string | undefined;
    
    try {
      if (data !== undefined) {
        // Применяем функцию fixRequestBody с защитой от ошибок
        let fixedData;
        try {
          fixedData = fixRequestBody(data);
        } catch (fixError) {
          console.error(`[correctApiRequest] [${requestId}] Ошибка в fixRequestBody:`, fixError);
          fixedData = data; // В случае ошибки используем исходные данные
        }
        
        // Преобразуем данные в JSON с защитой от циклических ссылок
        try {
          body = JSON.stringify(fixedData, (key, value) => {
            // Защита от циклических ссылок и оптимизация для больших объектов
            if (typeof value === 'object' && value !== null) {
              if (key && key.startsWith('_')) return undefined; // Пропускаем приватные поля
              
              // Ограничиваем размер массивов в логах
              if (Array.isArray(value) && value.length > 100) {
                return `Array(${value.length})`;
              }
            }
            return value;
          });
        } catch (jsonError) {
          console.error(`[correctApiRequest] [${requestId}] Ошибка при преобразовании данных в JSON:`, jsonError);
          
          // Пробуем упрощенное преобразование без циклических ссылок
          try {
            // Создаем копию данных без функций и циклических ссылок
            const seen = new WeakSet();
            const simplifyObject = (obj: any): any => {
              if (typeof obj === 'function') return '[Function]';
              if (typeof obj !== 'object' || obj === null) return obj;
              if (seen.has(obj)) return '[Circular]';
              
              seen.add(obj);
              const result: any = Array.isArray(obj) ? [] : {};
              
              for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                  try {
                    result[key] = simplifyObject(obj[key]);
                  } catch {
                    result[key] = '[Error]';
                  }
                }
              }
              
              return result;
            };
            
            const simplifiedData = simplifyObject(fixedData);
            body = JSON.stringify(simplifiedData);
          } catch (fallbackError) {
            console.error(`[correctApiRequest] [${requestId}] Критическая ошибка при преобразовании данных:`, fallbackError);
            
            // В крайнем случае отправляем пустой объект
            body = '{}';
          }
        }
      }
    } catch (bodyError) {
      console.error(`[correctApiRequest] [${requestId}] Ошибка при подготовке тела запроса:`, bodyError);
      // В случае критической ошибки используем пустой объект
      body = '{}';
    }

    // Выполнение запроса с таймаутом
    let controller: AbortController | undefined;
    let timeoutId: number | undefined;
    
    try {
      controller = new AbortController();
      const signal = controller.signal;
      
      // Устанавливаем таймаут в 30 секунд
      timeoutId = window.setTimeout(() => {
        controller?.abort();
        console.error(`[correctApiRequest] [${requestId}] Запрос превысил таймаут (30с): ${fullUrl}`);
      }, 30000);
      
      const response = await fetch(fullUrl, {
        method,
        headers,
        body,
        credentials: 'include',
        signal
      });
      
      // Очищаем таймаут после получения ответа
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      // Логируем статус
      console.log(`[correctApiRequest] [${requestId}] Статус: ${response.status} ${response.statusText}`);
      
      // Обработка HTTP ошибок
      if (!response.ok) {
        console.warn(`[correctApiRequest] [${requestId}] HTTP ошибка: ${response.status} ${response.statusText}`);
        
        // Проверка на ошибку авторизации 401 для автоматического повторного входа
        if (response.status === 401 && !endpoint.includes('/session')) {
          console.log(`[correctApiRequest] [${requestId}] Обнаружена ошибка авторизации, пытаемся повторно аутентифицироваться...`);
          
          // Пытаемся автоматически восстановить сессию
          const reauthResult = await sessionRestoreService.autoReauthenticate();
          
          if (reauthResult) {
            console.log(`[correctApiRequest] [${requestId}] Успешная повторная аутентификация, повторяем исходный запрос`);
            
            // Если повторная аутентификация удалась, повторяем исходный запрос
            return correctApiRequest(endpoint, method, data);
          } else {
            console.error(`[correctApiRequest] [${requestId}] Не удалось выполнить повторную аутентификацию`);
          }
        }
        
        // Пытаемся извлечь информацию из ответа
        let errorBody: any;
        try {
          errorBody = await response.json();
        } catch {
          try {
            errorBody = await response.text();
          } catch {
            errorBody = 'Не удалось получить содержимое ответа';
          }
        }
        
        throw new Error(
          `HTTP ошибка ${response.status}: ${
            typeof errorBody === 'object' && errorBody?.message
              ? errorBody.message
              : typeof errorBody === 'string'
              ? errorBody
              : response.statusText
          }`
        );
      }

      // Пробуем распарсить JSON
      try {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const json = await response.json();
          
          // Проверка на null или undefined
          if (json === null || json === undefined) {
            console.warn(`[correctApiRequest] [${requestId}] Получен пустой JSON ответ`);
            return {} as T; // Возвращаем пустой объект вместо null/undefined
          }
          
          return json;
        } else {
          // Если ответ не в формате JSON, пробуем вернуть как текст
          const text = await response.text();
          
          // Пробуем распарсить JSON из текста (многие серверы возвращают JSON с неправильным content-type)
          try {
            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
              const parsedJson = JSON.parse(text);
              console.log(`[correctApiRequest] [${requestId}] Успешно распарсили JSON из текстового ответа:`, 
                typeof parsedJson === 'object' ? 'object' : typeof parsedJson);
              return parsedJson;
            }
          } catch (parseError) {
            console.warn(`[correctApiRequest] [${requestId}] Не удалось распарсить JSON из текстового ответа:`, parseError instanceof Error ? parseError.message : parseError);
          }
          
          console.warn(`[correctApiRequest] [${requestId}] Ответ не в формате JSON (content-type: ${contentType || 'не указан'})`);
          
          // Если не удалось распарсить JSON, возвращаем текст в объекте
          return { 
            success: false,
            text, 
            status: response.status,
            message: 'Ответ сервера не в формате JSON' 
          } as unknown as T;
        }
      } catch (jsonError) {
        const text = await response.text();
        console.warn(`[correctApiRequest] [${requestId}] Ошибка при разборе ответа:`, jsonError);
        console.warn(`[correctApiRequest] [${requestId}] Содержимое ответа:`, text);
        
        // Пытаемся вернуть текст или сообщение об ошибке
        return {
          success: false,
          message: `Ошибка разбора ответа: ${jsonError instanceof Error ? jsonError.message : 'Неизвестная ошибка'}`,
          text: text.substring(0, 500) // Ограничиваем длину текста
        } as unknown as T;
      }
    } catch (fetchError: any) {
      // Очищаем таймаут в случае ошибки
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Обработка ошибок сети
      if (fetchError?.name === 'AbortError') {
        console.error(`[correctApiRequest] [${requestId}] Запрос был отменен по таймауту:`, fullUrl);
        throw new Error(`Превышено время ожидания запроса к ${endpoint}`);
      }
      
      if (fetchError?.message?.includes('NetworkError') || fetchError?.message?.includes('network')) {
        console.error(`[correctApiRequest] [${requestId}] Ошибка сети:`, fetchError.message);
        throw new Error(`Ошибка сети при запросе к ${endpoint}. Проверьте подключение к интернету.`);
      }
      
      // Пробрасываем исходную ошибку с дополнительным контекстом
      console.error(`[correctApiRequest] [${requestId}] Ошибка при выполнении запроса:`, fetchError);
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[correctApiRequest] [${requestId}] Критическая ошибка запроса:`, error.message || error);
    
    // Возвращаем ошибку в формате API
    const errorResponse = {
      success: false,
      message: error.message || 'Произошла неизвестная ошибка при запросе к API',
      error: error instanceof Error ? { name: error.name, stack: error.stack } : error,
      endpoint,
      method,
    };
    
    // Используем throw вместо return, чтобы сохранить поведение исключения
    throw errorResponse;
  }
}