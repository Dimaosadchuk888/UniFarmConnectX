import { Request } from 'express';

/**
 * Утилиты для валидации запросов
 */

/**
 * Извлекает и валидирует ID пользователя из запроса
 * @param req Express Request object
 * @param source Источник ID пользователя ('params', 'query', или 'body')
 * @param paramName Имя параметра (по умолчанию 'user_id')
 * @returns Возвращает id пользователя или null в случае ошибки
 */
export function extractUserId(
  req: Request,
  source: 'params' | 'query' | 'body' = 'params',
  paramName: string = 'user_id'
): number | null {
  let userIdParam: string | undefined;

  // Получаем значение из указанного источника
  switch (source) {
    case 'params':
      userIdParam = req.params[paramName];
      break;
    case 'query':
      userIdParam = req.query[paramName] as string;
      break;
    case 'body':
      userIdParam = req.body[paramName];
      break;
  }

  // Проверяем на наличие и тип
  if (!userIdParam || (typeof userIdParam !== 'string' && typeof userIdParam !== 'number')) {
    return null;
  }

  // Преобразуем в число
  const userId = typeof userIdParam === 'number' ? userIdParam : parseInt(userIdParam);

  // Проверяем на валидность числа
  if (isNaN(userId) || userId <= 0) {
    return null;
  }

  return userId;
}

/**
 * Проверяет, является ли значение числом
 */
export function isNumeric(value: any): boolean {
  if (typeof value === 'number') return true;
  if (typeof value !== 'string') return false;
  return !isNaN(parseFloat(value)) && isFinite(Number(value));
}