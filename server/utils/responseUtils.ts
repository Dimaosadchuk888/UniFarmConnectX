import { Response } from 'express';

/**
 * Утилиты для стандартизации ответов API
 */

/**
 * Отправляет успешный ответ с кодом 200
 * @param res Express Response object
 * @param data Данные для отправки
 */
export function sendSuccess(res: Response, data: any): void {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    success: true,
    data
  });
}

/**
 * Отправляет успешный ответ в виде массива с кодом 200
 * @param res Express Response object
 * @param data Массив данных
 */
export function sendSuccessArray(res: Response, data: any[]): void {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(data);
}

/**
 * Отправляет ошибку с указанным кодом статуса
 * @param res Express Response object
 * @param message Сообщение об ошибке
 * @param statusCode HTTP код статуса (по умолчанию 400)
 * @param errors Дополнительные детали ошибки
 */
export function sendError(res: Response, message: string, statusCode: number = 400, errors?: any): void {
  res.setHeader('Content-Type', 'application/json');
  const response: any = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  res.status(statusCode).json(response);
}

/**
 * Отправляет ошибку сервера (500)
 * @param res Express Response object
 * @param error Объект ошибки или сообщение
 */
export function sendServerError(res: Response, error: any): void {
  console.error('Server error:', error);
  sendError(
    res, 
    typeof error === 'string' ? error : 'Internal server error', 
    500,
    process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : error) : undefined
  );
}