import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

/**
 * Middleware для перевірки Telegram авторизації
 */
export function requireTelegramAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const telegramUser = req.telegram?.user;
    const isValidated = req.telegram?.validated;
    
    if (!telegramUser || !isValidated) {
      res.status(401).json({
        success: false,
        error: 'Требуется авторизация через Telegram Mini App'
      });
      return;
    }

    // Додаємо telegramUser до req для подальшого використання
    req.telegramUser = telegramUser;
    next();
  } catch (error) {
    logger.error('[TelegramAuth] Ошибка проверки авторизации', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: 'Ошибка проверки авторизации'
    });
  }
}

/**
 * Опціональний middleware для Telegram авторизації
 */
export function optionalTelegramAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const telegramUser = req.telegram?.user;
    const isValidated = req.telegram?.validated;
    
    if (telegramUser && isValidated) {
      req.telegramUser = telegramUser;
    }
    
    next();
  } catch (error) {
    logger.error('[TelegramAuth] Ошибка опциональной авторизации', { error: error instanceof Error ? error.message : String(error) });
    next();
  }
}