import type { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../core/BaseController';
import { logger } from '../../core/logger.js';
import { TelegramService } from './service';

export class TelegramController extends BaseController {
  private telegramService: TelegramService;

  constructor() {
    super();
    this.telegramService = new TelegramService();
  }

  async debugMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegramData = (req as any).telegram;
      const headers = {
        'x-telegram-init-data': req.headers['x-telegram-init-data'],
        'x-telegram-user-id': req.headers['x-telegram-user-id'],
        'telegram-init-data': req.headers['telegram-init-data']
      };
      
      logger.info('[TelegramDebug] Состояние middleware', {
        has_telegram: !!telegramData,
        validated: telegramData?.validated,
        has_user: !!telegramData?.user,
        user_id: telegramData?.user?.id,
        telegram_id: telegramData?.user?.telegram_id
      });
      
      this.sendSuccess(res, {
        middleware_active: !!telegramData,
        validated: telegramData?.validated || false,
        user_present: !!telegramData?.user,
        user_data: telegramData?.user ? {
          id: telegramData.user.id,
          telegram_id: telegramData.user.telegram_id,
          username: telegramData.user.username,
          ref_code: telegramData.user.ref_code
        } : null,
        headers_received: headers,
        timestamp: new Date().toISOString()
      });
    }, 'отладки Telegram middleware');
    } catch (error) {
      next(error);
    }
  }

  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const update = req.body;
      
      logger.info('[TelegramWebhook] Получено обновление от Telegram', {
        update_id: update.update_id,
        message: update.message ? {
          message_id: update.message.message_id,
          from: update.message.from,
          chat: update.message.chat,
          text: update.message.text
        } : null,
        callback_query: update.callback_query ? {
          id: update.callback_query.id,
          from: update.callback_query.from,
          data: update.callback_query.data
        } : null
      });

      // Обработка команды /start
      if (update.message && update.message.text && update.message.text.startsWith('/start')) {
        const chatId = update.message.chat.id;
        const userId = update.message.from.id;
        const username = update.message.from.username;
        
        logger.info('[TelegramWebhook] Обработка команды /start', {
          chat_id: chatId,
          user_id: userId,
          username: username
        });

        // Отправляем ответ с кнопкой запуска Mini App
        await this.telegramService.sendMessage(chatId, 
          '🌾 Добро пожаловать в UniFarm Connect!\n\n' +
          'Начните фармить UNI и TON токены прямо сейчас!', 
          {
            reply_markup: {
              inline_keyboard: [[{
                text: '🚀 Запустить UniFarm',
                web_app: { url: 'https://uni-farm-connect-x-osadchukdmitro2.replit.app' }
              }]]
            }
          }
        );
      }

      // Обработка callback query (нажатия на кнопки)
      if (update.callback_query) {
        await this.telegramService.answerCallbackQuery(update.callback_query.id);
      }

      this.sendSuccess(res, { 
        status: 'webhook_processed',
        update_id: update.update_id 
      });
    }, 'обработки Telegram webhook');
    } catch (error) {
      next(error);
    }
  }
}