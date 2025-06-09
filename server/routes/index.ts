/**
 * Централизованная маршрутизация для всех API модулей UniFarm
 * Импортирует и экспортирует маршруты из модулей
 */

import { Router } from 'express';

// Импорт маршрутов из модулей
import authRoutes from '../../modules/auth/routes';
import userRoutes from '../../modules/user/routes';
import walletRoutes from '../../modules/wallet/routes';
import farmingRoutes from '../../modules/farming/routes';
import missionsRoutes from '../../modules/missions/routes';
import referralRoutes from '../../modules/referral/routes';
import boostRoutes from '../../modules/boost/routes';
import telegramRoutes from '../../modules/telegram/routes';
import dailyBonusRoutes from '../../modules/dailyBonus/routes';
import adminRoutes from '../../modules/admin/routes';

const router = Router();

/**
 * Основные API маршруты
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/wallet', walletRoutes);
router.use('/farming', farmingRoutes);
router.use('/missions', missionsRoutes);
router.use('/referral', referralRoutes);
router.use('/boost', boostRoutes);
router.use('/telegram', telegramRoutes);
router.use('/daily-bonus', dailyBonusRoutes);
router.use('/admin', adminRoutes);

export default router;