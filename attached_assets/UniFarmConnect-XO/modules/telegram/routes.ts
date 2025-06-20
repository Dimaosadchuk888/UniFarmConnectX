import { Router } from 'express';
import { TelegramController } from './controller';

const router = Router();
const telegramController = new TelegramController();

// Маршруты Telegram
router.get('/debug', telegramController.debugMiddleware);

export default router;