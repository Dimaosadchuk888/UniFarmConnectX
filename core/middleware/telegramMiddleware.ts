import { Request, Response, NextFunction } from 'express';
import { validateTelegramInitData } from '../../utils/telegram';
import { logger } from '../logger';

export interface TelegramRequest extends Request {
  telegramUser?: {
    id: number;
    username?: string;
    first_name?: string;
  };
}

/**
 * Middleware для извлечения и валидации Telegram данных
 */
export function telegramMiddleware(req: TelegramRequest, res: Response, next: NextFunction) {
  try {
    // Извлекаем initData из заголовков
    const initData = req.headers['x-telegram-init-data'] as string;
    
    if (initData) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        const validation = validateTelegramInitData(initData, botToken);
        if (validation.valid && validation.user) {
          req.telegramUser = validation.user;
          logger.info('[TelegramMiddleware] Telegram user extracted', {
            telegram_id: validation.user.id,
            username: validation.user.username
          });
        }
      }
    }
    
    next();
  } catch (error) {
    logger.error('[TelegramMiddleware] Error processing Telegram data', {
      error: error instanceof Error ? error.message : String(error)
    });
    next();
  }
}
