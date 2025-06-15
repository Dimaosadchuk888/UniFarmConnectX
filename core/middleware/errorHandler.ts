import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';
import * as Sentry from '@sentry/node';

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
export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Глобальная ошибка сервера', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Відправляємо в Sentry з контекстом запиту
  if (Sentry && process.env.SENTRY_DSN) {
    try {
      Sentry.withScope((scope: any) => {
        scope.setTag('component', 'globalErrorHandler');
        scope.setContext('request', {
          url: req.originalUrl,
          method: req.method,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
        Sentry.captureException(error);
      });
    } catch (sentryError) {
      console.warn('[Sentry] Failed to capture global error:', sentryError instanceof Error ? sentryError.message : String(sentryError));
    }
  }

  const statusCode = (error as AppError).statusCode || 500;
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