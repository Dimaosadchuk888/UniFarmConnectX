import { Request, Response, NextFunction } from 'express';

/**
 * Расширяем тип Response для добавления новых методов
 */
declare module 'express' {
  interface Response {
    success: (data: any) => Response;
    error: (message: string, errors?: any, statusCode?: number) => Response;
  }
}

/**
 * Middleware для стандартизации ответов API
 * Добавляет методы success и error для упрощения формирования стандартных ответов
 */
export function responseFormatter(req: Request, res: Response, next: NextFunction): void {
  // Успешный ответ
  res.success = function(data: any): Response {
    return this.status(200).json({
      success: true,
      data
    });
  };

  // Ответ с ошибкой
  res.error = function(message: string, errors = null, statusCode = 400): Response {
    const response: any = {
      success: false,
      message
    };

    if (errors) {
      response.errors = errors;
    }

    return this.status(statusCode).json(response);
  };

  next();
}