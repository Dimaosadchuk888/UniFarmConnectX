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
    // ПОЛНОСТЬЮ ОТКЛЮЧЕН - все запросы проходят без проверки
    logger.info('[RateLimit] RateLimiter.middleware ОТКЛЮЧЕН - пропускаем все запросы');
    next();
  };
}

// Предустановленные конфигурации rate limiting
export const createRateLimit = (config: RateLimitConfig) => {
  // ПОЛНОСТЬЮ ОТКЛЮЧЕН - возвращаем функцию которая всегда пропускает запросы
  return (req: Request, res: Response, next: NextFunction) => {
    logger.info('[RateLimit] createRateLimit ОТКЛЮЧЕН - пропускаем все запросы');
    next();
  };
};

// Создаем функцию для пропуска rate limiting для внутренних операций
export const createRateLimitWithSkip = (config: RateLimitConfig, skipCondition?: (req: Request) => boolean) => {
  // ПОЛНОСТЬЮ ОТКЛЮЧЕН - возвращаем функцию которая всегда пропускает запросы
  return (req: Request, res: Response, next: NextFunction) => {
    logger.info('[RateLimit] createRateLimitWithSkip ОТКЛЮЧЕН - пропускаем все запросы');
    next();
  };
};

// Стандартный rate limiter ПОЛНОСТЬЮ ОТКЛЮЧЕН
export const standardRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // ПОЛНОСТЬЮ ОТКЛЮЧЕН - пропускаем все запросы
  logger.info('[RateLimit] standardRateLimit ОТКЛЮЧЕН - пропускаем все запросы');
  next();
};

// Строгий rate limiter ПОЛНОСТЬЮ ОТКЛЮЧЕН
export const strictRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // ПОЛНОСТЬЮ ОТКЛЮЧЕН - пропускаем все запросы
  logger.info('[RateLimit] strictRateLimit ОТКЛЮЧЕН - пропускаем все запросы');
  next();
};

// Либеральный rate limiter ПОЛНОСТЬЮ ОТКЛЮЧЕН
export const liberalRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // ПОЛНОСТЬЮ ОТКЛЮЧЕН - пропускаем все запросы
  logger.info('[RateLimit] liberalRateLimit ОТКЛЮЧЕН - пропускаем все запросы');
  next();
};

// Массовые операции rate limiter ПОЛНОСТЬЮ ОТКЛЮЧЕН
export const massOperationsRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // ПОЛНОСТЬЮ ОТКЛЮЧЕН - пропускаем все запросы
  logger.info('[RateLimit] massOperationsRateLimit ОТКЛЮЧЕН - пропускаем все запросы');
  next();
};

// Внутренние API rate limiter ПОЛНОСТЬЮ ОТКЛЮЧЕН
export const internalRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // ПОЛНОСТЬЮ ОТКЛЮЧЕН - пропускаем все запросы
  logger.info('[RateLimit] internalRateLimit ОТКЛЮЧЕН - пропускаем все запросы');
  next();
};

// Admin rate limiter ПОЛНОСТЬЮ ОТКЛЮЧЕН
export const adminRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // ПОЛНОСТЬЮ ОТКЛЮЧЕН - пропускаем все запросы
  logger.info('[RateLimit] adminRateLimit ОТКЛЮЧЕН - пропускаем все запросы');
  next();
};