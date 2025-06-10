import type { Request, Response } from 'express';
import { BaseController } from '@/core/BaseController';
import { TelegramService } from './service';

export class TelegramController extends BaseController {
  private telegramService: TelegramService;

  constructor() {
    super();
    this.telegramService = new TelegramService();
  }

  async debugMiddleware(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegramData = (req as any).telegram;
      const headers = {
        'x-telegram-init-data': req.headers['x-telegram-init-data'],
        'x-telegram-user-id': req.headers['x-telegram-user-id'],
        'telegram-init-data': req.headers['telegram-init-data']
      };
      
      console.log('[TelegramDebug] Состояние middleware:', {
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
  }
}