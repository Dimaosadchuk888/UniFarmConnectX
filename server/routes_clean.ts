/**
 * Чистая версия роутов для решения проблемы с TypeScript
 * Содержит только критически необходимые endpoints для frontend
 */

import { Router, Request, Response } from 'express';

const router = Router();

// ДИАГНОСТИЧЕСКИЙ РОУТ
router.get('/ref-debug-test', (req: Request, res: Response) => {
  console.log('[CLEAN ROUTES] 🔥 REF DEBUG TEST FROM CLEAN ROUTES!');
  res.json({ 
    success: true, 
    message: 'Clean routes referral debug test works', 
    timestamp: Date.now(),
    source: 'server/routes_clean.ts'
  });
});

// HEALTH CHECK
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    source: 'clean-routes'
  });
});

// ПРОСТОЙ ЭНДПОИНТ ДЛЯ /api/v2/users/profile
router.get('/users/profile', (req: Request, res: Response) => {
  console.log('[CLEAN ROUTES] 📱 Users profile request received');
  
  // Возвращаем основные данные пользователя ID=48
  res.json({
    success: true,
    data: {
      user: {
        id: 48,
        telegram_id: 88888888,
        username: "demo_user",
        first_name: "Demo User",
        ref_code: "REF_1750952576614_t938vs",
        balance_uni: 3262517.641765,
        balance_ton: 1000.06875
      }
    }
  });
});

// ЭНДПОИНТ ДЛЯ РЕФЕРАЛЬНОЙ СТАТИСТИКИ С SUPABASE
router.get('/referrals/stats', async (req: Request, res: Response) => {
  console.log('[CLEAN ROUTES] 🔗 Referral stats request received');
  
  try {
    // Импортируем Supabase клиент
    const { supabase } = await import('../core/supabase');
    
    const userId = req.query.user_id || 48; // Default to user 48
    console.log('[CLEAN ROUTES] Getting referral stats for user:', userId);
    
    // Получаем информацию о текущем пользователе
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('[CLEAN ROUTES] Error fetching user:', userError);
      return res.json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Получаем всех пользователей для построения реферальной цепочки
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, username, telegram_id, ref_code, referred_by, balance_uni, balance_ton');
    
    if (usersError) {
      console.error('[CLEAN ROUTES] Error fetching users:', usersError);
      return res.json({
        success: false, 
        error: 'Database error'
      });
    }
    
    // Строим реферальную цепочку пользователя
    const buildReferralChain = (userId: number, users: any[], level = 1): any[] => {
      const directReferrals = users.filter(user => user.referred_by === currentUser.ref_code);
      
      return directReferrals.map(referral => ({
        id: referral.id,
        username: referral.username,
        telegram_id: referral.telegram_id,
        level: level,
        balance_uni: referral.balance_uni || 0,
        balance_ton: referral.balance_ton || 0,
        referrals: buildReferralChain(referral.id, users, level + 1)
      }));
    };
    
    const referralChain = buildReferralChain(parseInt(userId.toString()), allUsers);
    
    // Подсчитываем статистику
    const countReferrals = (chain: any[]): { total: number, active: number } => {
      let total = chain.length;
      let active = chain.filter(ref => ref.balance_uni > 0 || ref.balance_ton > 0).length;
      
      chain.forEach(ref => {
        if (ref.referrals && ref.referrals.length > 0) {
          const subCount = countReferrals(ref.referrals);
          total += subCount.total;
          active += subCount.active;
        }
      });
      
      return { total, active };
    };
    
    const stats = countReferrals(referralChain);
    
    // Получаем реферальные доходы из транзакций
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('amount_uni, amount_ton')
      .eq('user_id', userId)
      .eq('type', 'REFERRAL_REWARD');
    
    let referralEarnings = 0;
    if (transactions && !txError) {
      referralEarnings = transactions.reduce((sum, tx) => {
        return sum + (tx.amount_uni || 0) + (tx.amount_ton || 0);
      }, 0);
    }
    
    console.log('[CLEAN ROUTES] ✅ Referral stats calculated:', {
      total: stats.total,
      active: stats.active,
      earnings: referralEarnings,
      levelsCount: Math.max(...referralChain.map(ref => ref.level), 0)
    });
    
    res.json({
      success: true,
      data: {
        user: currentUser.username,
        refCode: currentUser.ref_code,
        totalReferrals: stats.total,
        activeReferrals: stats.active,
        referralEarnings: referralEarnings,
        levels: referralChain,
        timestamp: new Date().toISOString(),
        source: 'supabase-live-data'
      }
    });
    
  } catch (error) {
    console.error('[CLEAN ROUTES] ❌ Error in referral stats:', error);
    res.json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ЭНДПОИНТ ДЛЯ СТАТУСА ФАРМИНГА
router.get('/farming/status', (req: Request, res: Response) => {
  console.log('[CLEAN ROUTES] 🌾 Farming status request received');
  
  res.json({
    success: true,
    data: {
      isActive: false,
      message: "Clean routes farming status (basic implementation)"
    }
  });
});

// ЭНДПОИНТ ДЛЯ DAILY BONUS
router.get('/daily-bonus/status', (req: Request, res: Response) => {
  console.log('[CLEAN ROUTES] 🎁 Daily bonus status request received');
  
  res.json({
    success: true,
    data: {
      available: true,
      message: "Clean routes daily bonus (basic implementation)"
    }
  });
});

// ЭНДПОИНТ ДЛЯ BOOST STATUS
router.get('/boost/farming-status', (req: Request, res: Response) => {
  console.log('[CLEAN ROUTES] 🚀 Boost farming status request received');
  
  res.json({
    success: true,
    data: {
      hasActiveBoost: false,
      message: "Clean routes boost status (basic implementation)"
    }
  });
});

export default router;