/**
 * Обертка над сервисами базы данных, которая перехватывает ошибки подключения
 * и возвращает "пустые" данные для работы без подключения к БД
 */

// Общий тип для сервисной функции
type ServiceFunction<T> = (...args: any[]) => Promise<T>;

// Тип для обработчика ошибок
type ErrorHandler<T> = (error: any, ...args: any[]) => Promise<T>;

/**
 * Оборачивает функцию сервиса в обработчик ошибок
 * @param fn Оригинальная функция сервиса
 * @param errorHandler Обработчик ошибок
 */
export function wrapServiceFunction<T>(
  fn: ServiceFunction<T>,
  errorHandler: ErrorHandler<T>
): ServiceFunction<T> {
  return async (...args: any[]): Promise<T> => {
    try {
      return await fn(...args);
    } catch (error) {
      // Проверяем, связана ли ошибка с проблемой подключения к БД
      if (
        error instanceof Error && 
        (
          error.message.includes('endpoint is disabled') || 
          error.message.includes('connection') || 
          error.message.includes('connect')
        )
      ) {
        console.warn(`[DB-WRAPPER] Перехвачена ошибка подключения к БД: ${error.message}`);
        return errorHandler(error, ...args);
      }
      
      // Если ошибка не связана с подключением, пробрасываем дальше
      throw error;
    }
  };
}

/**
 * Оборачивает весь сервис в обработчики ошибок
 * @param service Оригинальный сервис
 * @param errorHandlers Обработчики ошибок для методов
 */
export function wrapService<T extends Object>(
  service: T,
  errorHandlers: { [K in keyof T]?: ErrorHandler<any> }
): T {
  const wrappedService = { ...service };

  for (const key in errorHandlers) {
    const method = service[key];
    if (typeof method === 'function') {
      (wrappedService as any)[key] = wrapServiceFunction(
        method.bind(service),
        errorHandlers[key] as ErrorHandler<any>
      );
    }
  }

  return wrappedService;
}