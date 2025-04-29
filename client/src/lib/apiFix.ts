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
  // Если body отсутствует или не является объектом, возвращаем как есть
  if (!body || typeof body !== 'object') {
    return body;
  }

  // Создаем копию объекта для безопасного изменения
  const fixedBody = { ...body };

  // Если в теле запроса есть поле amount и оно является числом
  if ('amount' in fixedBody && typeof fixedBody.amount === 'number') {
    console.log('[apiFix] Преобразование amount из числа в строку:', fixedBody.amount);
    fixedBody.amount = fixedBody.amount.toString();
  }

  return fixedBody;
}