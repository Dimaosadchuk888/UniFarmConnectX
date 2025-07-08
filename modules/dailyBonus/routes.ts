import express, { Request, Response, Router } from 'express';
import { DailyBonusController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';
import { internalRateLimit, liberalRateLimit } from '../../core/middleware/rateLimiting';
import { supabase } from '../../core/supabase';

const router: Router = express.Router();
const dailyBonusController = new DailyBonusController();

// GET /api/daily-bonus/status - Получить статус ежедневного бонуса (используется в Dashboard)
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Упрощенная логика для Dashboard без сложной авторизации
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing user_id parameter'
      });
    }
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', parseInt(userId as string))
      .limit(1);
    
    if (error) {
      res.json({ success: false, error: error.message });
      return;
    }
    
    const user = users?.[0];
    if (!user) {
      res.json({
        success: true,
        data: {
          canClaim: true,
          streak: 0,
          bonusAmount: 500
        }
      });
      return;
    }
    
    const now = new Date();
    const lastClaimDate = user.checkin_last_date ? new Date(user.checkin_last_date) : null;
    
    let canClaim = true;
    let streakDays = user.checkin_streak || 0;
    
    if (lastClaimDate) {
      const daysSinceLastClaim = Math.floor((now.getTime() - lastClaimDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastClaim < 1) {
        canClaim = false;
      } else if (daysSinceLastClaim > 1) {
        streakDays = 0;
      }
    }
    
    const bonusAmount = Math.min(500 + (streakDays * 100), 2000);
    
    res.json({
      success: true,
      data: {
        canClaim: canClaim,
        streak: streakDays,
        bonusAmount: bonusAmount
      }
    });
  } catch (error) {
    res.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/daily-bonus/status-auth - Версия с авторизацией
router.get('/status-auth', requireTelegramAuth, liberalRateLimit, dailyBonusController.getDailyBonusInfo.bind(dailyBonusController));

// GET /api/daily-bonus/demo - Демо endpoint для frontend тестирования
router.get('/demo', liberalRateLimit, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      canClaim: true,
      streak: 5,
      bonusAmount: 500
    }
  });
});

// GET /api/daily-bonus/:userId - Получить информацию о ежедневном бонусе пользователя
router.get('/:userId', requireTelegramAuth, liberalRateLimit, dailyBonusController.getDailyBonusInfo.bind(dailyBonusController));

// POST /api/daily-bonus/claim - Забрать ежедневный бонус (используем internalRateLimit для частых операций)
router.post('/claim', requireTelegramAuth, internalRateLimit, dailyBonusController.claimDailyBonus.bind(dailyBonusController));

// GET /api/daily-bonus/:userId/calendar - Получить календарь ежедневных бонусов
router.get('/:userId/calendar', requireTelegramAuth, liberalRateLimit, dailyBonusController.getDailyBonusCalendar.bind(dailyBonusController));

// GET /api/daily-bonus/:userId/stats - Получить статистику ежедневных бонусов
router.get('/:userId/stats', requireTelegramAuth, liberalRateLimit, dailyBonusController.getDailyBonusStats.bind(dailyBonusController));

// GET /api/daily-bonus/:userId/check - Проверить доступность ежедневного бонуса
router.get('/:userId/check', requireTelegramAuth, liberalRateLimit, dailyBonusController.checkDailyBonusAvailability.bind(dailyBonusController));

export default router;