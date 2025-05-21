import { Router } from 'express';
import { handleTelegramWebhook } from './webhook';
import { telegramBot } from './bot';
import logger from '../utils/logger';

const telegramRouter = Router();

// Вебхук для получения обновлений от Telegram
telegramRouter.post('/webhook', handleTelegramWebhook);

// Эндпоинт для проверки статуса бота
telegramRouter.get('/status', async (req, res) => {
  try {
    const botInfo = await telegramBot.getMe();
    
    if (botInfo && botInfo.ok) {
      return res.json({
        success: true,
        data: {
          botName: botInfo.result?.username,
          status: 'online',
          timestamp: new Date().toISOString()
        }
      });
    } else {
      return res.status(503).json({
        success: false,
        error: 'Telegram Bot API недоступен',
        details: botInfo.description
      });
    }
  } catch (error) {
    logger.error('[TelegramRoutes] Ошибка при получении статуса бота:', error);
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Эндпоинт для настройки бота
telegramRouter.post('/setup', async (req, res) => {
  try {
    const appUrl = req.body.appUrl || process.env.MINI_APP_URL;
    
    if (!appUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL мини-приложения не указан' 
      });
    }
    
    const result = await telegramBot.setupMiniApp(appUrl);
    
    if (result) {
      return res.json({
        success: true,
        message: 'Настройка бота успешно выполнена',
        appUrl
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Ошибка при настройке бота'
      });
    }
  } catch (error) {
    logger.error('[TelegramRoutes] Ошибка при настройке бота:', error);
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default telegramRouter;