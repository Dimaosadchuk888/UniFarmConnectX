import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const timestamp = new Date().toISOString();
  
  console.error(`[${timestamp}] Error in ${req.method} ${req.url}:`, err);
  
  // Определяем статус код
  let statusCode = 500;
  let message = 'Внутренняя ошибка сервера';
  
  if (err.status) {
    statusCode = err.status;
  }
  
  if (err.message) {
    message = err.message;
  }
  
  // В development показываем полную ошибку
  const response: any = {
    success: false,
    error: message,
    timestamp
  };
  
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err;
  }
  
  res.status(statusCode).json(response);
}