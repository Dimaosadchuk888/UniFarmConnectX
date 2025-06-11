import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Создает операционную ошибку приложения
 */
export function createAppError(message: string, statusCode: number = 500): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

/**
 * Глобальный обработчик ошибок
 */
export function globalErrorHandler(
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = error.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Логируем ошибку
  logger.error(`${req.method} ${req.originalUrl}`, {
    error: error.message,
    stack: error.stack,
    statusCode,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Формируем ответ
  const errorResponse: any = {
    success: false,
    error: error.message || 'Internal Server Error',
    statusCode
  };

  // В development режиме добавляем stack trace
  if (!isProduction && error.stack) {
    errorResponse.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Обработчик для несуществующих маршрутов
 */
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    error: 'Route not found',
    statusCode: 404,
    path: req.originalUrl
  });
}

/**
 * Wrapper для async функций для автоматической обработки ошибок
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}