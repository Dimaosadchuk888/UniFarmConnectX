import express from 'express';
import { telegramController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = express.Router();

// GET /api/v2/telegram/webapp-data - Получить данные Telegram WebApp
router.get('/webapp-data', requireTelegramAuth, telegramController.getWebAppData.bind(telegramController));

// POST /api/v2/telegram/set-commands - Установить команды бота
router.post('/set-commands', requireTelegramAuth, telegramController.setCommands.bind(telegramController));

// POST /api/v2/telegram/send-message - Отправить сообщение пользователю (дополнительный endpoint)
router.post('/send-message', requireTelegramAuth, telegramController.sendMessage.bind(telegramController));

export default router;