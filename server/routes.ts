/**
 * Centralized API routes configuration for UniFarm
 * Aggregates all module routes under /api/v2 prefix
 */

import { Router } from 'express';
import {
  userRoutes,
  walletRoutes,
  farmingRoutes,
  missionsRoutes,
  referralRoutes,
  boostRoutes,
  telegramRoutes,
  dailyBonusRoutes,
  adminRoutes,
  authRoutes
} from '../modules';

const router = Router();

// Authentication routes
router.use('/auth', authRoutes);

// User management routes
router.use('/users', userRoutes);

// Core application routes
router.use('/wallet', walletRoutes);
router.use('/farming', farmingRoutes);
router.use('/uni-farming', farmingRoutes); // Alias for backward compatibility
router.use('/missions', missionsRoutes);
router.use('/referrals', referralRoutes);
router.use('/boost', boostRoutes);
router.use('/daily-bonus', dailyBonusRoutes);

// Integration routes
router.use('/telegram', telegramRoutes);

// Admin routes
router.use('/admin', adminRoutes);

export default router;