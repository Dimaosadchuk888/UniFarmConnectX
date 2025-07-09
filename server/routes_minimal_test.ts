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
// Adding referral module
import referralRoutes from '../modules/referral/routes';

router.use('/auth', authRoutes);
router.use('/monitor', monitorRoutes);
router.use('/farming', farmingRoutes);
router.use('/users', userRoutes);
router.use('/wallet', walletRoutes);
router.use('/boost', boostRoutes);
router.use('/missions', missionRoutes);
router.use('/referral', referralRoutes);

export default router;