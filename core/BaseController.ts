import { Request, Response } from 'express';

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
    handler: (req: Request, res: Response) => Promise<any>,
    operationName: string
  ): Promise<void> {
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error(`[${this.constructor.name}] Ошибка ${operationName}:`, error);
      
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
  protected sendSuccess(res: Response, data: any, message?: string): void {
    res.json({
      success: true,
      data,
      message
    });
  }

  /**
   * Стандартна відповідь з помилкою
   */
  protected sendError(res: Response, error: string, statusCode: number = 400, details?: any): void {
    res.status(statusCode).json({
      success: false,
      error,
      details
    });
  }

  /**
   * Отримання Telegram користувача з request (після middleware)
   */
  protected getTelegramUser(req: Request): any {
    const telegramUser = (req as any).telegramUser;
    if (!telegramUser) {
      throw new Error('Telegram пользователь не найден в запросе');
    }
    return telegramUser;
  }

  /**
   * Валідація обов'язкових полів
   */
  protected validateRequiredFields(body: any, fields: string[]): void {
    const missingFields = fields.filter(field => !body[field]);
    if (missingFields.length > 0) {
      throw new Error(`Отсутствуют обязательные поля: ${missingFields.join(', ')}`);
    }
  }
}