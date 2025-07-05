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
import { adminBotRoutes } from '../modules/adminBot/routes';
import { supabase } from '../core/supabase';

const router = express.Router();

// Removed test endpoint - will add after module routes

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

// Debug endpoint для проверки данных пользователя 48 - DEBUG ONLY
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
    const userId = req.query.user_id as string;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing user_id parameter'
      });
    }
    
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
router.get('/routes/debug', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Main routes are working',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      '/auth/*',
      '/farming/*',
      '/uni-farming/*',
      '/users/*',
      '/wallet/*',
      '/boost/*',
      '/missions/*',
      '/referral/*',
      '/referrals/*',
      '/daily-bonus/*',
      '/transactions/*',
      '/telegram/*',
      '/ton-farming/*',
      '/airdrop/*',
      '/admin/*',
      '/monitor/*'
    ]
  });
});

// Простой endpoint для тестирования пользователя
router.get('/me', async (req: Request, res: Response) => {
  console.log('[SIMPLE ME] Route accessed for user 48');
  
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 48)
      .single();

    if (user) {
      console.log('[SIMPLE ME] User 48 found successfully');
      res.json({
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
      console.log('[SIMPLE ME] User 48 not found');
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
  } catch (error) {
    console.error('[SIMPLE ME] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Endpoint для получения базовых данных пользователя
// ПРИМЕЧАНИЕ: Этот endpoint конфликтует с модульным /users/profile
// Удаляем его чтобы использовать правильный endpoint из modules/user/routes.ts
// который поддерживает JWT авторизацию

// Main auth routes
router.use('/auth', authRoutes);

// Test endpoint для проверки базовых роутов
router.get('/test-basic-routes', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Basic routes are working',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint для проверки правильной работы роутов
router.get('/test-routes', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Routes are working correctly',
    timestamp: new Date().toISOString(),
    routes: {
      auth: '/auth',
      farming: '/farming',
      users: '/users',
      wallet: '/wallet',
      boost: '/boost',
      missions: '/missions',
      referral: '/referral',
      dailyBonus: '/daily-bonus',
      telegram: '/telegram',
      tonFarming: '/ton-farming',
      transactions: '/transactions',
      airdrop: '/airdrop',
      admin: '/admin',
      monitor: '/monitor'
    }
  });
});

// Removed conflicting /users/:id route - it was intercepting /users/profile requests
// User profile should be accessed via /users/profile with authentication from modules/user/routes.ts

// Endpoint для проверки balance пользователя
router.get('/wallet/balance', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).telegramUser?.id || req.query.user_id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - user authentication required'
    });
  }
  
  try {
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

// Endpoint для проверки farming статуса
router.get('/farming/status', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).telegramUser?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - user authentication required'
    });
  }
  
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', parseInt(userId))
      .single();
    
    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    const farmingData = {
      isActive: user.uni_farming_active || false,
      depositAmount: parseFloat(user.uni_deposit_amount?.toString() || "0"),
      farmingBalance: parseFloat(user.uni_farming_balance?.toString() || "0"),
      farmingRate: parseFloat(user.uni_farming_rate?.toString() || "0"),
      startTime: user.uni_farming_start_timestamp || null
    };

    return res.status(200).json({
      success: true,
      data: farmingData,
      user_id: userId
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// ===== ПОДКЛЮЧЕНИЕ ВСЕХ МОДУЛЬНЫХ РОУТОВ =====

// Farming routes
router.use('/farming', farmingRoutes);
router.use('/uni-farming', farmingRoutes); // Alias for uni-farming endpoints

// User routes
router.use('/users', userRoutes);

// Wallet routes
router.use('/wallet', walletRoutes);

// Boost routes
router.use('/boost', boostRoutes);
router.use('/boosts', boostRoutes); // Alias for boosts
router.use('/ton-boost', boostRoutes); // Alias for ton-boost (for dashboard)

// Mission routes
router.use('/missions', missionRoutes);
router.use('/user-missions', missionRoutes); // Alias for user-missions

// Referral routes
router.use('/referral', referralRoutes);
router.use('/referrals', referralRoutes); // Alias for referrals

// Daily bonus routes
router.use('/daily-bonus', dailyBonusRoutes);

// Telegram routes
router.use('/telegram', telegramRoutes);

// TON farming routes
router.use('/ton-farming', tonFarmingRoutes);

// Transaction routes
router.use('/transactions', transactionsRoutes);

// Airdrop routes
router.use('/airdrop', airdropRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// Admin bot routes
router.use('/admin-bot', adminBotRoutes);

// Monitor routes
router.use('/monitor', monitorRoutes);

// Debug endpoint to test if routes are working
router.get('/debug/profile-test', (req: Request, res: Response) => {
  console.log('[DEBUG] /debug/profile-test hit');
  res.json({
    success: true,
    message: 'Debug endpoint works',
    headers: {
      authorization: req.headers.authorization ? 'Present' : 'Missing'
    }
  });
});

export default router;