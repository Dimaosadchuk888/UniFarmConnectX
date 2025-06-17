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

// Стандартный rate limiter - 100 запросов в 15 минут
export const standardRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // 100 запросов
  message: 'Слишком много запросов. Попробуйте через 15 минут'
});

// Строгий rate limiter для критических операций - 10 запросов в 1 минуту
export const strictRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 10, // 10 запросов
  message: 'Превышен лимит для финансовых операций. Попробуйте через минуту'
});

// Либеральный rate limiter для чтения данных - 200 запросов в 15 минут
export const liberalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 200, // 200 запросов
  message: 'Слишком много запросов на чтение. Попробуйте через 15 минут'
});

// Admin rate limiter - 50 запросов в 5 минут
export const adminRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 минут
  max: 50, // 50 запросов
  message: 'Превышен лимит для административных операций'
});