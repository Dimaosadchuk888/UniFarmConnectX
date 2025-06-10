import { Request, Response, NextFunction } from 'express';

// Расширяем интерфейс Request для TypeScript
interface TelegramUser {
  id: number;
  telegram_id: number;
  username?: string;
}

interface TelegramData {
  user?: TelegramUser;
  validated?: boolean;
}

interface RequestWithTelegram extends Request {
  telegram?: TelegramData;
  telegramUser?: TelegramUser;
}

/**
 * Middleware для перевірки Telegram авторизації
 */
export function requireTelegramAuth(req: RequestWithTelegram, res: Response, next: NextFunction): void {
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
    console.error('[TelegramAuth] Ошибка проверки авторизации:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка проверки авторизации'
    });
  }
}

/**
 * Опціональний middleware для Telegram авторизації
 */
export function optionalTelegramAuth(req: RequestWithTelegram, res: Response, next: NextFunction): void {
  try {
    const telegramUser = req.telegram?.user;
    const isValidated = req.telegram?.validated;
    
    if (telegramUser && isValidated) {
      req.telegramUser = telegramUser;
    }
    
    next();
  } catch (error) {
    console.error('[TelegramAuth] Ошибка опциональной авторизации:', error);
    next();
  }
}