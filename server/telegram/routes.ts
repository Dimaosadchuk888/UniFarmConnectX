import { Router } from 'express';

const telegramRouter = Router();

// Упрощенный статус бота
telegramRouter.get('/status', (req: any, res: any) => {
  const hasBotToken = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  
  res.json({
    success: true,
    data: {
      hasToken: hasBotToken,
      status: hasBotToken ? 'configured' : 'missing_token',
      miniAppUrl: process.env.MINI_APP_URL || process.env.APP_URL,
      timestamp: new Date().toISOString()
    }
  });
});

// Базовый webhook эндпоинт
telegramRouter.post('/webhook', (req: any, res: any) => {
  console.log('[Telegram] Webhook получен:', req.body);
  res.status(200).json({ success: true });
});

export default telegramRouter;