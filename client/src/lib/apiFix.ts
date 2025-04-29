/**
 * Вспомогательные функции для исправления типов данных в API запросах
 * 
 * Исправляет известный баг с несоответствием типов: 
 * - сервер ожидает поле amount как строку
 * - клиент иногда отправляет как число
 */

/**
 * Преобразует поле amount в строковый формат в теле запроса
 * @param body Исходное тело запроса
 * @returns Модифицированное тело запроса
 */
export function fixRequestBody(body: any): any {
  if (body && typeof body === 'object') {
    // Если тело запроса содержит поле 'amount' и оно числовое, преобразуем его в строку
    if ('amount' in body && typeof body.amount === 'number') {
      console.log(`[apiFix] Преобразуем числовое amount=${body.amount} в строку`);
      return {
        ...body,
        amount: String(body.amount)
      };
    }

    // Рекурсивно обрабатываем вложенные объекты
    const result: any = {};
    for (const key in body) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        const value = body[key];
        if (typeof value === 'object' && value !== null) {
          result[key] = fixRequestBody(value);
        } else {
          result[key] = value;
        }
      }
    }
    
    return result;
  }
  
  return body;
}