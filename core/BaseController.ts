import { Request, Response } from 'express';
import { logger } from './logger';

/**
 * Базовий контролер з загальною логікою обробки помилок та відповідей
 */
export abstract class BaseController {
  /**
   * Обгортка для обробки помилок в контролерах
   */
  protected async handleRequest(
    req: Request,
    res: Response,
    handler: (req: Request, res: Response) => Promise<void>,
    operationName: string
  ): Promise<void> {
    try {
      await handler(req, res);
    } catch (error: any) {
      logger.error(`[${this.constructor.name}] Ошибка ${operationName}`, { error: error instanceof Error ? error.message : String(error) });
      
      // Перевіряємо, чи відповідь вже відправлена
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: `Ошибка ${operationName}`,
          details: error.message
        });
      }
    }
  }

  /**
   * Стандартна успішна відповідь
   */
  protected sendSuccess(res: Response, data: unknown, message?: string): void {
    res.json({
      success: true,
      data,
      message
    });
  }

  /**
   * Стандартна відповідь з помилкою
   */
  protected sendError(res: Response, error: string, statusCode: number = 400, details?: unknown): void {
    res.status(statusCode).json({
      success: false,
      error,
      details
    });
  }

  /**
   * Отримання Telegram користувача з request (після middleware)
   */
  protected getTelegramUser(req: Request): Express.Request['telegramUser'] {
    const telegramUser = req.telegramUser;
    if (!telegramUser) {
      throw new Error('Telegram пользователь не найден в запросе');
    }
    return telegramUser;
  }

  /**
   * Валідація Telegram користувача з детальною перевіркою
   */
  protected validateTelegramAuth(req: Request, res: Response): Express.Request['telegram'] | null {
    const telegramUser = req.telegram?.user;
    const isValidated = req.telegram?.validated;
    
    if (!telegramUser || !isValidated) {
      res.status(401).json({
        success: false,
        error: 'Требуется авторизация через Telegram Mini App',
        need_telegram_auth: true,
        debug: {
          has_telegram: !!req.telegram,
          has_user: !!telegramUser,
          validated: isValidated
        }
      });
      return null;
    }
    
    return req.telegram;
  }

  /**
   * Валідація обов'язкових полів
   */
  protected validateRequiredFields(body: Record<string, unknown>, fields: string[]): void {
    const missingFields = fields.filter(field => !body[field]);
    if (missingFields.length > 0) {
      throw new Error(`Отсутствуют обязательные поля: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Стандартна обробка помилок контролера
   */
  protected handleControllerError(error: unknown, res: Response, operation: string): void {
    logger.error(`[${this.constructor.name}] Ошибка ${operation}`, { error: error instanceof Error ? error.message : String(error) });
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: `Ошибка ${operation}`,
        details: error instanceof Error ? error.message : error
      });
    }
  }

  /**
   * Валідація параметрів запиту
   */
  protected validateParams(req: Request, requiredParams: string[]): boolean {
    const missingParams = requiredParams.filter(param => !req.params[param]);
    return missingParams.length === 0;
  }

  /**
   * Отримання пагінації з запиту
   */
  protected getPagination(req: Request): { page: number; limit: number } {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    return { page, limit };
  }
}