/**
 * ЧИСТЫЕ API РОУТЫ ДЛЯ ДИАГНОСТИКИ REFERRAL СИСТЕМЫ
 */

import express, { Request, Response } from 'express';

const router = express.Router();

// ДИАГНОСТИЧЕСКИЙ РОУТ ДЛЯ REFERRALS - ПРОВЕРКА РОУТИНГА
router.get('/ref-debug-test', (req, res) => {
  console.log('[SERVER ROUTES] 🔥 REF DEBUG TEST WORKS!');
  res.json({ success: true, message: 'Referral debug test works', timestamp: Date.now() });
});

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Простой /me endpoint
router.get('/me', async (req: Request, res: Response) => {
  console.log('[SIMPLE ME] Route accessed for user 48');
  
  try {
    const { supabase } = await import('../core/supabase');
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
      console.log('[SIMPLE ME] User 48 not found, error:', error);
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
  } catch (err: any) {
    console.error('[SIMPLE ME] Error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// РЕФЕРЕНТНЫЕ ТЕСТОВЫЕ РОУТЫ
router.get('/referrals/stats', async (req: Request, res: Response) => {
  console.log('[REFERRALS] Stats endpoint accessed');
  res.json({
    success: true,
    message: 'Referrals stats endpoint works',
    timestamp: Date.now()
  });
});

export default router;