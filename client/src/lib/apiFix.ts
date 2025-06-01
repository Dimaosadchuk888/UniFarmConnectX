/**
 * Исправления и утилиты для API запросов
 */

export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: any;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Проверяет, является ли ответ успешным
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Проверяет, является ли ответ ошибкой
 */
export function isErrorResponse(response: ApiResponse): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * Извлекает данные из API ответа
 */
export function extractData<T>(response: ApiResponse<T>): T | null {
  if (isSuccessResponse(response)) {
    return response.data;
  }
  return null;
}

/**
 * Извлекает сообщение об ошибке из API ответа
 */
export function extractError(response: ApiResponse): string {
  if (isErrorResponse(response)) {
    return response.message || response.error || 'Произошла неизвестная ошибка';
  }
  return '';
}

/**
 * Создает стандартный успешный ответ
 */
export function createSuccessResponse<T>(data: T, message?: string): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message })
  };
}

/**
 * Создает стандартный ответ с ошибкой
 */
export function createErrorResponse(error: string, message?: string, details?: any): ApiErrorResponse {
  return {
    success: false,
    error,
    ...(message && { message }),
    ...(details && { details })
  };
}

/**
 * Обрабатывает ошибки API запросов
 */
export function handleApiError(error: any): ApiErrorResponse {
  if (error.response) {
    // Ошибка с ответом от сервера
    return createErrorResponse(
      error.response.data?.error || 'Ошибка сервера',
      error.response.data?.message,
      error.response.data
    );
  } else if (error.request) {
    // Ошибка сети
    return createErrorResponse('Ошибка сети', 'Не удается подключиться к серверу');
  } else {
    // Другие ошибки
    return createErrorResponse('Неизвестная ошибка', error.message);
  }
}