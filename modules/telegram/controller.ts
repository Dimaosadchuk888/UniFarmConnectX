import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../core/BaseController';
import { telegramService } from './service';
import { logger } from '../../core/logger';

export class TelegramController extends BaseController {
  /**
   * Получить данные Telegram WebApp
   */
  async getWebAppData(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
        const { init_data } = req.query;
        
        if (!init_data || typeof init_data !== 'string') {
          return this.sendError(res, 'Отсутствует параметр init_data', 400);
        }

        const result = await telegramService.getWebAppData(init_data);
        
        if (result.success) {
          this.sendSuccess(res, result.data);
        } else {
          this.sendError(res, result.error || 'Ошибка получения WebApp данных', 400);
        }
      }, 'получения данных Telegram WebApp');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Установить команды бота
   */
  async setCommands(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
        const { commands } = req.body;
        
        if (!commands || !Array.isArray(commands)) {
          return this.sendError(res, 'Отсутствует массив команд', 400);
        }

        // Валидация команд
        for (const cmd of commands) {
          if (!cmd.command || !cmd.description) {
            return this.sendError(res, 'Каждая команда должна иметь command и description', 400);
          }
        }

        const result = await telegramService.setCommands(commands);
        
        if (result.success) {
          this.sendSuccess(res, { message: result.message });
        } else {
          this.sendError(res, result.message, 400);
        }
      }, 'установки команд бота');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Отправить сообщение пользователю
   */
  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
        const { chat_id, text, options } = req.body;
        
        if (!chat_id || !text) {
          return this.sendError(res, 'Отсутствуют обязательные параметры: chat_id, text', 400);
        }

        const result = await telegramService.sendMessage(chat_id, text, options);
        
        if (result.success) {
          this.sendSuccess(res, { messageId: result.messageId });
        } else {
          this.sendError(res, result.error || 'Ошибка отправки сообщения', 400);
        }
      }, 'отправки сообщения через Telegram');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle webhook updates from Telegram
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      // Always respond 200 OK to Telegram immediately
      res.status(200).json({ ok: true });

      // Process update asynchronously
      const update = req.body;
      
      if (!update) {
        logger.warn('[TelegramController] Получен пустой webhook update');
        return;
      }

      logger.info('[TelegramController] Получен webhook update', {
        updateId: update.update_id,
        messageText: update.message?.text,
        from: update.message?.from?.username
      });

      // Process the update
      await telegramService.processUpdate(update);
      
    } catch (error) {
      logger.error('[TelegramController] Ошибка обработки webhook', error);
      // Don't call next(error) here since we already responded to Telegram
    }
  }
}

export const telegramController = new TelegramController();