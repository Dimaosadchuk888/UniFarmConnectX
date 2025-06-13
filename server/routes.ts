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

const router = express.Router();

// Health check endpoint for production monitoring
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
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