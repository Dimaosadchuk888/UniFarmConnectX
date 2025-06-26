import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

/**
 * Улучшенный CORS middleware для безопасности Telegram Mini App
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://telegram.org',
    'https://web.telegram.org',
    'https://uni-farm-connect-x-alinabndrnk99.replit.app',
    'https://replit.dev',
    'http://localhost:3000',
    'http://localhost:5173'
  ];

  // Проверяем Telegram User Agent
  const userAgent = req.headers['user-agent'] || '';
  const isTelegramWebApp = userAgent.includes('TelegramBot') || 
                          userAgent.includes('Telegram') ||
                          req.headers['x-telegram-init-data'];

  if (isTelegramWebApp || (origin && allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Telegram-Init-Data'
  );
  res.header('Access-Control-Allow-Credentials', 'true');

  // Обработка preflight запросов
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
}