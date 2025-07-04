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

// ДИАГНОСТИЧЕСКИЙ РОУТ ДЛЯ REFERRALS - ПРОВЕРКА РОУТИНГА
router.get('/ref-debug-test', (req, res) => {
  console.log('[SERVER ROUTES] 🔥 REF DEBUG TEST WORKS!');
  res.json({ success: true, message: 'Referral debug test works', timestamp: Date.now() });
});

// Debug endpoint для проверки данных пользователя 48
router.get('/debug/user48', async (req: Request, res: Response) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 48)
      .single();
    
    res.json({
      success: !error,
      error: error?.message || null,
      user: user,
      balanceTypes: {
        balance_uni: typeof user?.balance_uni,
        balance_ton: typeof user?.balance_ton
      }
    });
  } catch (err: any) {
    res.json({
      success: false,
      error: err.message,
      user: null
    });
  }
});

// Direct balance endpoint for testing user_id=1
router.get('/wallet/balance-direct', async (req: Request, res: Response) => {
  try {
    const userId = req.query.user_id as string || "1";
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, balance_uni, balance_ton, uni_farming_active, uni_deposit_amount, uni_farming_balance')
      .eq('id', parseInt(userId))
      .single();
    
    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    const balanceData = {
      uniBalance: parseFloat(user.balance_uni?.toString() || "0"),
      tonBalance: parseFloat(user.balance_ton?.toString() || "0"),
      uniFarmingActive: user.uni_farming_active || false,
      uniDepositAmount: parseFloat(user.uni_deposit_amount?.toString() || "0"),
      uniFarmingBalance: parseFloat(user.uni_farming_balance?.toString() || "0")
    };

    return res.status(200).json({
      success: true,
      data: balanceData,
      user_id: userId
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
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

// Debug endpoint для тестирования UserService
router.get('/debug/user48', async (req: Request, res: Response) => {
  try {
    const { SupabaseUserRepository } = await import('../modules/user/service.js');
    const userRepository = new SupabaseUserRepository();
    const user = await userRepository.getUserById(48);
    
    res.json({
      message: 'UserService test for ID=48',
      user_found: !!user,
      user_data: user ? {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        balance_uni: user.balance_uni,
        balance_ton: user.balance_ton,
        balance_uni_type: typeof user.balance_uni,
        balance_ton_type: typeof user.balance_ton,
        created_at: user.created_at
      } : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to test UserService',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
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

// ПРОСТОЙ /me ENDPOINT ДЛЯ ДИАГНОСТИКИ РОУТИНГА
const handleMeEndpoint = async (req: any, res: any) => {
  console.log('[SIMPLE ME] Route accessed for diagnostics');
  
  try {
    // Прямой запрос пользователя 48 для тестирования
    const { supabase } = await import('../core/supabase');
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 48)
      .single();

    if (user) {
      console.log('[SIMPLE ME] User 48 found successfully');
      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            telegram_id: user.telegram_id,
            username: user.username,
            first_name: user.first_name,
            ref_code: user.ref_code,
            balance_uni: user.balance_uni,
            balance_ton: user.balance_ton
          }
        }
      });
    } else {
      console.log('[SIMPLE ME] User 48 not found, error:', error);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
  } catch (err) {
    console.error('[SIMPLE ME] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
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
    const bonusAmount = Math.max(500, streak * 50).toString();
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
        next_bonus_amount: "500",
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
    const bonusAmount = Math.max(500, newStreak * 50);
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
router.use('/ton-boost', boostRoutes); // Alias for ton-boost (for dashboard)
router.use('/missions', missionRoutes);
router.use('/user-missions', missionRoutes); // Alias for user-missions
// ТЕСТОВЫЙ endpoint для проверки server/routes.ts
router.get('/test-server-routing', (req, res) => {
  console.log('[SERVER ROUTES] TEST SERVER ROUTING WORKS!');
  res.json({ success: true, message: 'Server routing is working', timestamp: Date.now() });
});

// ДИАГНОСТИЧЕСКИЙ РОУТ ДЛЯ REFERRALS
router.get('/referrals/direct-test', (req, res) => {
  console.log('[SERVER ROUTES] REFERRALS DIRECT TEST WORKS!');
  res.json({ success: true, message: 'Direct referrals test works', timestamp: Date.now() });
});

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