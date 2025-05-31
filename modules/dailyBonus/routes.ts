import express from 'express';
import { DailyBonusController } from './controller';

const router = express.Router();
const dailyBonusController = new DailyBonusController();

// GET /api/daily-bonus/:userId - Получить информацию о ежедневном бонусе пользователя
router.get('/:userId', dailyBonusController.getDailyBonusInfo.bind(dailyBonusController));

// POST /api/daily-bonus/claim - Забрать ежедневный бонус
router.post('/claim', dailyBonusController.claimDailyBonus.bind(dailyBonusController));

// GET /api/daily-bonus/:userId/calendar - Получить календарь ежедневных бонусов
router.get('/:userId/calendar', dailyBonusController.getDailyBonusCalendar.bind(dailyBonusController));

// GET /api/daily-bonus/:userId/stats - Получить статистику ежедневных бонусов
router.get('/:userId/stats', dailyBonusController.getDailyBonusStats.bind(dailyBonusController));

// GET /api/daily-bonus/:userId/check - Проверить доступность ежедневного бонуса
router.get('/:userId/check', dailyBonusController.checkDailyBonusAvailability.bind(dailyBonusController));

export default router;