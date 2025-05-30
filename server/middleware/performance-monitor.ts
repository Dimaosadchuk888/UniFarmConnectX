
import { Request, Response, NextFunction } from 'express';
import { healthMonitor } from '../utils/healthMonitor';

interface RequestWithTiming extends Request {
  startTime?: number;
}

/**
 * Middleware для мониторинга производительности API запросов
 */
export function performanceMonitorMiddleware(req: RequestWithTiming, res: Response, next: NextFunction) {
  req.startTime = Date.now();
  
  // Логируем начало запроса
  console.log(`[API] ${req.method} ${req.originalUrl} - Start`);
  
  // Перехватываем завершение ответа
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - (req.startTime || Date.now());
    
    // Записываем метрики в health monitor
    healthMonitor.recordApiResponse(responseTime);
    
    // Логируем завершение
    const status = res.statusCode;
    const statusText = status >= 200 && status < 300 ? '✅' : 
                     status >= 400 && status < 500 ? '⚠️' : '❌';
    
    console.log(`[API] ${req.method} ${req.originalUrl} - ${statusText} ${status} (${responseTime}ms)`);
    
    // Записываем ошибки в мониторинг
    if (status >= 400) {
      healthMonitor.recordApiError(req.originalUrl, `HTTP ${status}`);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

/**
 * Middleware для мониторинга ошибок
 */
export function errorMonitorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  const responseTime = Date.now() - (req as any).startTime || 0;
  
  // Записываем ошибку в мониторинг
  healthMonitor.recordApiError(req.originalUrl, err.message || 'Unknown error');
  
  console.error(`[API ERROR] ${req.method} ${req.originalUrl} - ❌ Error (${responseTime}ms):`, err.message);
  
  next(err);
}
