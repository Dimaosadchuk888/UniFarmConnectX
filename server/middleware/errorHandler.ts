import { Request, Response, NextFunction } from 'express';

/**
 * Middleware для централизованной обработки ошибок
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error('[ErrorHandler]', {
    path: req.path,
    method: req.method,
    statusCode,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

/**
 * Класс ошибки валидации
 */
export class ValidationError extends Error {
  name = 'ValidationError';
  errors: Record<string, string> | null;

  constructor(message: string, errors?: Record<string, string>) {
    super(message);
    this.errors = errors || null;
  }
}

/**
 * Класс ошибки "ресурс не найден"
 */
export class NotFoundError extends Error {
  name = 'NotFoundError';

  constructor(message: string) {
    super(message);
  }
}

/**
 * Класс ошибки авторизации
 */
export class UnauthorizedError extends Error {
  name = 'UnauthorizedError';

  constructor(message: string = 'Не авторизован') {
    super(message);
  }
}

/**
 * Класс ошибки доступа
 */
export class ForbiddenError extends Error {
  name = 'ForbiddenError';

  constructor(message: string = 'Доступ запрещен') {
    super(message);
  }
}

/**
 * Класс ошибки недостаточного баланса
 */
export class InsufficientFundsError extends Error {
  name = 'InsufficientFundsError';
  errors: Record<string, string>;

  constructor(message: string, balance: number | string, currency: string) {
    super(message);
    this.errors = {
      amount: `Недостаточно средств для операции. Доступный баланс: ${balance} ${currency}`
    };
  }
}

/**
 * Класс ошибки базы данных
 */
export class DatabaseError extends Error {
  name = 'DatabaseError';
  originalError: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.originalError = originalError || null;
  }
}