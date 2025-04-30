import { Request, Response, NextFunction } from 'express';

/**
 * Middleware для централизованной обработки ошибок
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  // Подготовка деталей для журналирования ошибки
  const errorDetails = {
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    stack: err.stack
  };
  
  console.error(`[ErrorHandler] ${err.message}`, errorDetails);
  
  // Определяем HTTP-код ответа на основе типа ошибки
  let statusCode = 500;
  let errorMessage = 'Внутренняя ошибка сервера';
  
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = err.message;
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorMessage = err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorMessage = 'Не авторизован';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    errorMessage = 'Доступ запрещен';
  }
  
  // Отправляем стандартизированный ответ об ошибке
  res.status(statusCode).json({
    success: false,
    message: errorMessage,
    errors: err.errors || null
  });
}

/**
 * Класс ошибки валидации
 */
export class ValidationError extends Error {
  name = 'ValidationError';
  errors: any;
  
  constructor(message: string, errors?: any) {
    super(message);
    this.errors = errors;
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
  name = 'ValidationError';
  errors: any;
  
  constructor(message: string, balance: number, currency: string) {
    super(message);
    this.errors = {
      amount: `Недостаточно средств для операции. Доступный баланс: ${balance} ${currency}`
    };
  }
}