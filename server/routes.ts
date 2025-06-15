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
import { supabase } from '../core/supabase';

const router = express.Router();

// Health check endpoint for production monitoring
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint - using Supabase API
router.get('/debug/db-users', async (req: Request, res: Response) => {
  try {
    const { data: allUsers, error } = await supabase
      .from('users')
      .select('id, telegram_id, username, ref_code, created_at')
      .order('id', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      total_users: allUsers?.length || 0,
      users: allUsers || []
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

// Прямой маршрут для Telegram авторизации
router.post('/auth/telegram', async (req, res, next) => {
  try {
    const { AuthController } = await import('../modules/auth/controller');
    const authController = new AuthController();
    await authController.authenticateTelegram(req, res, next);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Auth error' });
  }
});

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

// JWT Authentication endpoint with fallback to Telegram
router.get('/me', async (req, res) => {
  console.log('[JWT Debug] /me route hit, checking Authorization header');
  console.log('[JWT Debug] Authorization header:', req.headers.authorization);
  
  try {
    // Проверяем JWT токен в Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('[JWT Debug] JWT token found, verifying...');
      
      try {
        const jwt = await import('jsonwebtoken');
        const jwtSecret = process.env.JWT_SECRET || 'Yy9zN3u7JD2qWvX8mCLr0eK1gQpbTMA4';
        console.log('[JWT Debug] Using secret length:', jwtSecret.length);
        const decoded = jwt.verify(token, jwtSecret) as any;
        console.log('[JWT Debug] Token decoded:', { telegram_id: decoded.telegram_id, username: decoded.username });
        
        if (decoded.telegram_id) {
          // Используем Supabase API напрямую
          const { supabase } = await import('../core/supabase');
          console.log('[JWT Debug] Querying Supabase for user...');
          const { data: user, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', decoded.telegram_id)
            .single();
          
          console.log('[JWT Debug] Supabase query result:', { user: !!user, error: dbError });
          
          if (user) {
            console.log('[JWT Debug] User found, returning success response');
            return res.json({
              success: true,
              user: {
                id: user.id,
                telegram_id: user.telegram_id,
                username: user.username,
                ref_code: user.ref_code,
                balance_uni: user.balance_uni,
                balance_ton: user.balance_ton,
                auth_method: 'jwt'
              }
            });
          } else {
            console.log('[JWT Debug] No user found in database');
          }
        }
      } catch (jwtError) {
        console.log('[JWT Debug] Token verification failed:', jwtError);
        return res.status(401).json({
          success: false,
          error: 'Invalid JWT token',
          need_auth: true
        });
      }
    } else {
      console.log('[JWT Debug] No Bearer token found');
    }

    console.log('[JWT Debug] Falling back to Telegram auth');
    // Fallback к Telegram методу
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
  } catch (error) {
    console.error('[JWT Route] Error:', error);
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
});

// Core module routes
router.use('/farming', farmingRoutes);
router.use('/uni-farming', farmingRoutes); // Alias for uni-farming endpoints
router.use('/users', userRoutes);

router.post('/users/profile', async (req, res) => {
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