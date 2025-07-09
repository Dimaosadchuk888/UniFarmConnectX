import express, { Request, Response } from 'express';
import { supabase } from '../core/supabase';

const router = express.Router();

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Test import endpoint
router.get('/test-import', (req: Request, res: Response) => {
  console.log('[ROUTES MINIMAL TEST] Working!');
  res.json({ 
    success: true, 
    message: 'Minimal routes working!',
    timestamp: new Date().toISOString()
  });
});

// Now try importing one module at a time
import authRoutes from '../modules/auth/routes';
import monitorRoutes from '../modules/monitor/routes';
import farmingRoutes from '../modules/farming/routes';
import userRoutes from '../modules/user/routes';
import walletRoutes from '../modules/wallet/routes';
import boostRoutes from '../modules/boost/routes';
import missionRoutes from '../modules/missions/routes';
import referralRoutes from '../modules/referral/routes';
import dailyBonusRoutes from '../modules/dailyBonus/routes';
// Testing all modules
import tonFarmingRoutes from '../modules/tonFarming/routes';
import airdropRoutes from '../modules/airdrop/routes';
import telegramRoutes from '../modules/telegram/routes';
import transactionsRoutes from '../modules/transactions/routes';
import adminRoutes from '../modules/admin/routes';
import { adminBotRoutes } from '../modules/adminBot/routes';
import debugRoutes from '../modules/debug/debugRoutes';

router.use('/auth', authRoutes);
router.use('/monitor', monitorRoutes);
router.use('/farming', farmingRoutes);
router.use('/users', userRoutes);
router.use('/wallet', walletRoutes);
router.use('/boost', boostRoutes);
router.use('/missions', missionRoutes);
router.use('/referral', referralRoutes);
router.use('/daily-bonus', dailyBonusRoutes);
router.use('/ton-farming', tonFarmingRoutes);
router.use('/airdrop', airdropRoutes);
router.use('/telegram', telegramRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/admin', adminRoutes);
router.use('/admin-bot', adminBotRoutes);
router.use('/debug', debugRoutes);

export default router;