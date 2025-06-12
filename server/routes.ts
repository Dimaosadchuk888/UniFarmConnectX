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

const router = express.Router();

// Authentication routes
router.use('/auth', authRoutes);

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

// Monitoring routes
router.use('/monitor', monitorRoutes);

export default router;