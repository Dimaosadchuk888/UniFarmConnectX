import express from 'express';
import { DailyBonusController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = express.Router();
const dailyBonusController = new DailyBonusController();

// GET /api/daily-bonus/:userId - Получить информацию о ежедневном бонусе пользователя
router.get('/:userId', requireTelegramAuth, dailyBonusController.getDailyBonusInfo.bind(dailyBonusController));

// POST /api/daily-bonus/claim - Забрать ежедневный бонус
router.post('/claim', requireTelegramAuth, dailyBonusController.claimDailyBonus.bind(dailyBonusController));

// GET /api/daily-bonus/:userId/calendar - Получить календарь ежедневных бонусов
router.get('/:userId/calendar', requireTelegramAuth, dailyBonusController.getDailyBonusCalendar.bind(dailyBonusController));

// GET /api/daily-bonus/:userId/stats - Получить статистику ежедневных бонусов
router.get('/:userId/stats', requireTelegramAuth, dailyBonusController.getDailyBonusStats.bind(dailyBonusController));

// GET /api/daily-bonus/:userId/check - Проверить доступность ежедневного бонуса
router.get('/:userId/check', requireTelegramAuth, dailyBonusController.checkDailyBonusAvailability.bind(dailyBonusController));

export default router;