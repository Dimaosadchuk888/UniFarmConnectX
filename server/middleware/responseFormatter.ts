import { Request, Response, NextFunction } from 'express';

/**
 * Middleware для стандартизации формата ответов API
 */
export const responseFormatter = (req: Request, res: Response, next: NextFunction) => {
  // Перехватываем оригинальный res.json для форматирования
  const originalJson = res.json;
  const originalSend = res.send;

  // Добавляем стандартные методы ответа
  res.sendSuccess = (data: any, message?: string, status: number = 200) => {
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      message: message || 'Request processed successfully',
      data
    };

    res.status(status);
    return originalJson.call(res, response);
  };

  res.sendError = (message: string, status: number = 400, error?: any) => {
    const response = {
      success: false,
      timestamp: new Date().toISOString(),
      error: {
        message,
        code: status,
        details: error
      }
    };

    res.status(status);
    return originalJson.call(res, response);
  };

  // Перехватываем res.json для автоматического форматирования
  res.json = function(body: any) {
    // Если это уже отформатированный ответ, отправляем как есть
    if (body && typeof body === 'object' && ('success' in body || 'error' in body)) {
      return originalJson.call(this, body);
    }

    // Если это API маршрут, форматируем ответ
    if (req.path.startsWith('/api/')) {
      const formattedResponse = {
        success: res.statusCode < 400,
        timestamp: new Date().toISOString(),
        data: body
      };

      // Добавляем error если статус код указывает на ошибку
      if (res.statusCode >= 400) {
        formattedResponse.success = false;
        delete (formattedResponse as any).data;
        (formattedResponse as any).error = {
          message: body?.message || 'An error occurred',
          code: res.statusCode,
          details: body
        };
      }

      return originalJson.call(this, formattedResponse);
    }

    // Для не-API маршрутов отправляем как есть
    return originalJson.call(this, body);
  };

  next();
};