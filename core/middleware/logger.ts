import type { Request, Response, NextFunction } from 'express';

export function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  console.log(`[${timestamp}] ${method} ${url} - ${userAgent}`);
  
  // Логируем тело запроса для POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
    console.log(`[${timestamp}] Request body:`, JSON.stringify(req.body, null, 2));
  }
  
  next();
}