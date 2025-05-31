import type { Request, Response } from 'express';

export class TelegramController {
  async debugMiddleware(req: Request, res: Response) {
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
    
    res.json({
      success: true,
      data: {
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
      }
    });
  }
}