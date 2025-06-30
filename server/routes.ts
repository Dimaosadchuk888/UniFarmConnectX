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
import adminRoutes from '../modules/admin/routes';
import { supabase } from '../core/supabase';

const router = express.Router();

// Health check endpoint for production monitoring
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint for routes diagnostics
router.get('/debug/routes', (req: Request, res: Response) => {
  res.json({
    success: true,
    routes_loaded: {
      auth: !!authRoutes,
      user: !!userRoutes,
      wallet: !!walletRoutes,
      farming: !!farmingRoutes,
      admin: !!adminRoutes,
      monitor: !!monitorRoutes
    },
    admin_module_check: {
      routes_imported: !!adminRoutes,
      controller_available: typeof adminRoutes === 'object'
    },
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint для проверки переменных окружения
router.get('/debug/env', (req: Request, res: Response) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    BYPASS_AUTH: process.env.BYPASS_AUTH,
    PORT: process.env.PORT,
    has_supabase_key: !!process.env.SUPABASE_KEY,
    has_supabase_url: !!process.env.SUPABASE_URL
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
router.post('/webhook', async (req: Request, res: Response, next) => {
  try {
    const { TelegramController } = await import('../modules/telegram/controller');
    const telegramController = new TelegramController();
    await telegramController.handleWebhook(req, res, next);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Webhook processing error'
    });
  }
});

// Дублирующий webhook маршрут под разными путями для надежности
router.post('/telegram/webhook', async (req: Request, res: Response, next) => {
  try {
    const { TelegramController } = await import('../modules/telegram/controller');
    const telegramController = new TelegramController();
    await telegramController.handleWebhook(req, res, next);
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
router.post('/register/telegram', async (req, res, next) => {
  try {
    const { AuthController } = await import('../modules/auth/controller');
    const authController = new AuthController();
    await authController.registerTelegram(req, res, next);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Registration error' });
  }
});

// JWT Authentication endpoint - через отдельную функцию для исправления TypeScript
const handleMeEndpoint = async (req: any, res: any) => {
  console.log('[JWT Debug] /me route hit, checking Authorization header');
  console.log('[JWT Debug] Authorization header:', req.headers.authorization);
  
  try {
    // Проверяем JWT токен в Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('[JWT Debug] JWT token found, verifying...');
      
      const jwt = await import('jsonwebtoken');
      const jwtSecret = process.env.JWT_SECRET || 'unifarm_jwt_secret_key_2025_production';
      console.log('[JWT Debug] Using secret length:', jwtSecret.length);
      
      try {
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
            console.log('[JWT Debug] No user found in database, returning 401');
            return res.status(401).json({
              success: false,
              error: 'User not found',
              need_auth: true
            });
          }
        } else {
          console.log('[JWT Debug] No telegram_id in token');
          return res.status(401).json({
            success: false,
            error: 'Invalid token payload',
            need_auth: true
          });
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
      console.log('[JWT Debug] No Bearer token found, returning 401');
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        need_auth: true
      });
    }
  } catch (error) {
    console.error('[JWT Route] Error:', error);
    return res.status(500).json({ success: false, error: 'Authentication error' });
  }
};

router.get('/me', handleMeEndpoint);

// Daily Bonus endpoints with safe error handling
router.get('/daily-bonus-status', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).telegramUser?.id || req.query.user_id || "43";
    const { supabase } = require('../core/supabase');
    
    // Simple database query without complex parsing
    const { data: user, error } = await supabase
      .from('users')
      .select('checkin_streak, checkin_last_date')
      .eq('id', userId)
      .single();

    if (error || !user) {
      res.json({
        success: true,
        data: {
          can_claim: true,
          streak_days: 1,
          next_bonus_amount: "100",
          last_claim_date: null
        }
      });
      return;
    }

    // Safe calculations
    const streak = user.checkin_streak || 0;
    const bonusAmount = Math.max(100, streak * 50).toString();
    const lastClaimDate = user.checkin_last_date;
    const canClaim = !lastClaimDate || new Date().toDateString() !== new Date(lastClaimDate).toDateString();

    res.json({
      success: true,
      data: {
        can_claim: canClaim,
        streak_days: streak,
        next_bonus_amount: bonusAmount,
        last_claim_date: lastClaimDate
      }
    });

  } catch (error) {
    console.error('[DailyBonus] Error:', error);
    res.json({
      success: true,
      data: {
        can_claim: true,
        streak_days: 1,
        next_bonus_amount: "100",
        last_claim_date: null
      }
    });
  }
});

// Daily Bonus claim endpoint
router.post('/daily-bonus-claim', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).telegramUser?.id || "43";
    const { supabase } = require('../core/supabase');

    // Get current user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('checkin_streak, checkin_last_date, balance_uni')
      .eq('id', userId)
      .single();

    if (userError) {
      res.status(500).json({
        success: false,
        error: 'Database error'
      });
      return;
    }

    // Safe calculations
    const currentStreak = user?.checkin_streak || 0;
    const newStreak = currentStreak + 1;
    const bonusAmount = Math.max(100, newStreak * 50);
    const currentBalance = parseFloat(user?.balance_uni || '0');
    const newBalance = currentBalance + bonusAmount;

    // Update user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        checkin_streak: newStreak,
        checkin_last_date: new Date().toISOString(),
        balance_uni: newBalance.toString()
      })
      .eq('id', userId);

    if (updateError) {
      res.status(500).json({
        success: false,
        error: 'Failed to update user'
      });
      return;
    }

    // Create transaction record
    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'DAILY_BONUS',
        amount_uni: bonusAmount.toString(),
        amount_ton: '0',
        status: 'completed',
        created_at: new Date().toISOString()
      });

    res.json({
      success: true,
      data: {
        bonus_amount: bonusAmount.toString(),
        new_streak: newStreak,
        new_balance: newBalance.toString()
      }
    });

  } catch (error) {
    console.error('[DailyBonusClaim] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
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
router.use('/admin', adminRoutes);

// Monitoring routes
router.use('/monitor', monitorRoutes);

export default router;