import express, { Request, Response } from 'express';
import authRoutes from '../modules/auth/routes';
import monitorRoutes from '../modules/monitor/routes';
import farmingRoutes from '../modules/farming/routes';
import userRoutes from '../modules/user/routes';
import walletRoutes from '../modules/wallet/routes';
import boostRoutes from '../modules/boost/routes';
import missionRoutes from '../modules/missions/routes';
import referralRoutes from '../modules/referral/routes';
import dailyBonusRoutes from '../modules/dailyBonus/routes';
import telegramRoutes from '../modules/telegram/routes';
import tonFarmingRoutes from '../modules/tonFarming/routes';
import transactionsRoutes from '../modules/transactions/routes';
import airdropRoutes from '../modules/airdrop/routes';
import { db } from '../core/db';
import { users } from '../shared/schema';
import { desc } from 'drizzle-orm';

const router = express.Router();

// Health check endpoint for production monitoring
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint - cleaned from old database references
router.get('/debug/db-users', async (req: Request, res: Response) => {
  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.id));
    res.json({
      success: true,
      total_users: allUsers.length,
      users: allUsers.map(user => ({
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        ref_code: user.ref_code,
        created_at: user.created_at
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Telegram webhook endpoint (корневой уровень для Telegram API)
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { TelegramController } = await import('../modules/telegram/controller');
    const telegramController = new TelegramController();
    await telegramController.handleWebhook(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Webhook processing error'
    });
  }
});

// Дублирующий webhook маршрут под разными путями для надежности
router.post('/telegram/webhook', async (req: Request, res: Response) => {
  try {
    const { TelegramController } = await import('../modules/telegram/controller');
    const telegramController = new TelegramController();
    await telegramController.handleWebhook(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Webhook processing error'
    });
  }
});

// Authentication routes
router.use('/auth', authRoutes);

// Регистрация Telegram пользователей
router.post('/register/telegram', async (req, res) => {
  try {
    const { AuthController } = await import('../modules/auth/controller');
    const authController = new AuthController();
    await authController.registerTelegram(req, res);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Registration error' });
  }
});

// User profile endpoint
router.get('/me', async (req: Request, res: Response) => {
  const { requireTelegramAuth } = await import('../core/middleware/telegramAuth');
  requireTelegramAuth(req, res, async () => {
    try {
      const { UserController } = await import('../modules/user/controller');
      const userController = new UserController();
      await userController.getCurrentUser(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });
});

// Core module routes
router.use('/farming', farmingRoutes);
router.use('/uni-farming', farmingRoutes); // Alias for uni-farming endpoints
router.use('/users', userRoutes);

// Прямой маршрут для профиля пользователя
router.get('/users/profile', async (req, res) => {
  try {
    const { UserController } = await import('../modules/user/controller');
    const userController = new UserController();
    await userController.getCurrentUser(req, res);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Profile error' });
  }
});
router.use('/wallet', walletRoutes);
router.use('/boost', boostRoutes);
router.use('/boosts', boostRoutes); // Alias for boosts
router.use('/missions', missionRoutes);
router.use('/user-missions', missionRoutes); // Alias for user-missions
router.use('/referral', referralRoutes);
router.use('/referrals', referralRoutes); // Alias for referrals
router.use('/daily-bonus', dailyBonusRoutes);
router.use('/telegram', telegramRoutes);
router.use('/ton-farming', tonFarmingRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/airdrop', airdropRoutes);

// Monitoring routes
router.use('/monitor', monitorRoutes);

export default router;