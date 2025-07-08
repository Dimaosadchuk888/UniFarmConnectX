import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      message: 'Too many requests, please try again later',
      skipSuccessfulRequests: false,
      ...config
    };
    
    // Очистка старых записей каждые 5 минут
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  private getKey(req: Request): string {
    // Используем IP адрес и telegram_id для более точного ограничения
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const telegramUser = (req as any).telegramUser;
    const telegramId = telegramUser?.id || 'anonymous';
    return `${ip}:${telegramId}`;
  }

  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const key = this.getKey(req);
    const now = Date.now();
    
    if (!this.store[key] || this.store[key].resetTime < now) {
      // Создаем или сбрасываем лимит
      this.store[key] = {
        count: 1,
        resetTime: now + this.config.windowMs
      };
      next();
      return;
    }

    this.store[key].count++;

    if (this.store[key].count > this.config.max) {
      // Превышен лимит
      logger.warn('[RateLimit] Request limit exceeded', {
        key,
        count: this.store[key].count,
        max: this.config.max,
        path: req.path,
        method: req.method
      });

      res.status(429).json({
        success: false,
        error: this.config.message,
        retryAfter: Math.ceil((this.store[key].resetTime - now) / 1000)
      });
      return;
    }

    // Добавляем headers с информацией о лимитах
    res.set({
      'X-RateLimit-Limit': this.config.max.toString(),
      'X-RateLimit-Remaining': Math.max(0, this.config.max - this.store[key].count).toString(),
      'X-RateLimit-Reset': Math.ceil(this.store[key].resetTime / 1000).toString()
    });

    next();
  };
}

// Предустановленные конфигурации rate limiting
export const createRateLimit = (config: RateLimitConfig) => {
  return new RateLimiter(config).middleware;
};

// Создаем функцию для пропуска rate limiting для внутренних операций
export const createRateLimitWithSkip = (config: RateLimitConfig, skipCondition?: (req: Request) => boolean) => {
  const limiter = new RateLimiter(config);
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Пропускаем rate limiting для внутренних операций
    if (skipCondition && skipCondition(req)) {
      logger.info('[RateLimit] Пропуск лимита по условию skipCondition', {
        path: req.path,
        method: req.method
      });
      return next();
    }
    
    // Пропускаем rate limiting для авторизованных пользователей с JWT для определенных endpoints
    const isInternalAPI = req.path.includes('/transactions') || 
                          req.path.includes('/farming/status') || 
                          req.path.includes('/wallet/balance') ||
                          req.path.includes('/boost/farming-status') ||
                          req.path.includes('/daily-bonus/claim') ||
                          req.path.includes('/farming/deposit') ||
                          req.path.includes('/boost/purchase') ||
                          req.path.includes('/missions/list') ||
                          req.path.includes('/missions/user') ||
                          req.path.includes('/users/profile');
    
    // Проверяем наличие Authorization header с Bearer токеном
    const authHeader = req.headers.authorization;
    const hasValidAuth = authHeader && authHeader.startsWith('Bearer ');
    
    if (isInternalAPI && hasValidAuth) {
      logger.info('[RateLimit] Пропуск лимита для внутренних API с Bearer авторизацией', {
        path: req.path,
        method: req.method,
        hasAuth: !!hasValidAuth
      });
      return next();
    }
    
    return limiter.middleware(req, res, next);
  };
};

// Стандартный rate limiter - увеличен лимит для UniFarm операций
export const standardRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 500, // Увеличено с 100 до 500 запросов
  message: 'Слишком много запросов. Попробуйте через 15 минут'
});

// Строгий rate limiter только для публичных endpoints (auth, referral, debug)
export const strictRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 50, // Увеличено с 10 до 50 запросов
  message: 'Превышен лимит для публичных операций. Попробуйте через минуту'
});

// Либеральный rate limiter для чтения данных - увеличен лимит
export const liberalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 1000, // Увеличено с 200 до 1000 запросов
  message: 'Слишком много запросов на чтение. Попробуйте через 15 минут'
});

// Специальный rate limiter для массовых операций (максимально либеральный)
export const massOperationsRateLimit = createRateLimitWithSkip({
  windowMs: 1 * 60 * 1000, // 1 минута
  max: 10000, // 10000 запросов в минуту
  message: 'Слишком много массовых запросов',
  skipSuccessfulRequests: true
}, (req) => {
  // Всегда пропускаем запросы с Bearer токеном для массовых операций
  const authHeader = req.headers.authorization;
  const hasValidAuth = authHeader && authHeader.startsWith('Bearer ');
  
  if (hasValidAuth) {
    logger.info('[RateLimit] Пропуск массовых операций для Bearer токена', {
      path: req.path,
      method: req.method
    });
    return true;
  }
  
  return false;
});

// Специальный rate limiter для внутренних API (транзакции, фарминг, баланс)
export const internalRateLimit = createRateLimitWithSkip({
  windowMs: 5 * 60 * 1000, // 5 минут
  max: 2000, // Очень высокий лимит для внутренних операций
  message: 'Слишком много внутренних запросов. Попробуйте через 5 минут'
}, (req) => {
  // Полностью пропускаем rate limiting для авторизованных пользователей
  return !!(req as any).telegramUser && (req as any).telegramUser.id;
});

// Admin rate limiter - без изменений
export const adminRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 минут
  max: 50, // 50 запросов
  message: 'Превышен лимит для административных операций'
});