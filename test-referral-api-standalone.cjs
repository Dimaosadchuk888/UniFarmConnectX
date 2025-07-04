/**
 * STANDALONE ТЕСТ API РЕФЕРАЛЬНОЙ СИСТЕМЫ
 * Запускает минимальный Express сервер для тестирования исправленного ReferralService
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Импортируем исправленный ReferralService напрямую
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Инициализация Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Реплицируем ReferralService.getRealReferralStats с исправлениями
async function getRealReferralStats(userId) {
  try {
    console.log('[TEST API] Начинаем получение реальной статистики для userId:', userId);
    
    // 1. Поиск пользователя
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, ref_code')
      .eq('id', userId)
      .single();
      
    if (userError || !user) {
      console.log('[TEST API] Пользователь не найден:', userError?.message);
      throw new Error('Пользователь не найден');
    }
    
    console.log('[TEST API] Пользователь найден:', user);
    
    // 2. Получение реферальных транзакций с правильными колонками
    const { data: referralTransactions, error: refError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_uni, amount_ton, currency, description, created_at')
      .eq('user_id', userId)
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false });
      
    console.log('[TEST API] Найдено транзакций:', referralTransactions?.length || 0);
    
    if (refError) {
      console.log('[TEST API] Ошибка транзакций:', refError);
      throw refError;
    }
    
    // 3. Получение всех пользователей для реферальной цепочки
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, username, first_name, referred_by')
      .order('id', { ascending: true });
      
    if (usersError) {
      console.log('[TEST API] Ошибка пользователей:', usersError);
      throw usersError;
    }
    
    console.log('[TEST API] Найдено пользователей:', allUsers?.length || 0);
    
    // 4. Анализ транзакций по уровням
    const levelIncome = {};
    const levelCounts = {};
    
    if (referralTransactions && referralTransactions.length > 0) {
      referralTransactions.forEach(tx => {
        const levelMatch = tx.description?.match(/L(\d+)/);
        if (levelMatch) {
          const level = parseInt(levelMatch[1]);
          if (!levelIncome[level]) {
            levelIncome[level] = { uni: 0, ton: 0 };
          }
          if (!levelCounts[level]) {
            levelCounts[level] = 0;
          }
          
          // Обрабатываем UNI транзакции
          if (tx.amount_uni && parseFloat(tx.amount_uni) > 0) {
            levelIncome[level].uni += parseFloat(tx.amount_uni);
          }
          // Обрабатываем TON транзакции  
          if (tx.amount_ton && parseFloat(tx.amount_ton) > 0) {
            levelIncome[level].ton += parseFloat(tx.amount_ton);
          }
          
          levelCounts[level]++;
        }
      });
    }
    
    // 5. Подсчет общего дохода
    let totalUniEarned = 0;
    let totalTonEarned = 0;
    let totalReferrals = 0;
    
    Object.values(levelIncome).forEach(income => {
      totalUniEarned += income.uni;
      totalTonEarned += income.ton;
    });
    
    Object.values(levelCounts).forEach(count => {
      totalReferrals += count;
    });
    
    // 6. Поиск прямых рефералов
    const { data: directReferrals } = await supabase
      .from('users')
      .select('id, username, referred_by')
      .eq('referred_by', userId);
      
    // 7. Формирование ответа
    const result = {
      user_id: user.id,
      username: user.username,
      ref_code: user.ref_code,
      total_referrals: totalReferrals,
      total_uni_earned: totalUniEarned,
      total_ton_earned: totalTonEarned,
      direct_referrals_count: directReferrals?.length || 0,
      level_income: levelIncome,
      level_counts: levelCounts,
      transactions_found: referralTransactions?.length || 0,
      direct_referrals: directReferrals || []
    };
    
    console.log('[TEST API] Сформирован результат:', {
      totalTransactions: result.transactions_found,
      totalUniEarned: result.total_uni_earned.toFixed(6),
      totalTonEarned: result.total_ton_earned.toFixed(6),
      levelsFound: Object.keys(levelIncome).length,
      directReferrals: result.direct_referrals_count
    });
    
    return result;
    
  } catch (error) {
    console.error('[TEST API] Ошибка:', error);
    throw error;
  }
}

// API endpoint для тестирования
app.get('/test-referral-stats/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Неверный userId'
      });
    }
    
    const stats = await getRealReferralStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('[TEST API ERROR]:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения реферальной информации',
      details: error.message
    });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Тестовый API сервер запущен на порту ${PORT}`);
  console.log(`📋 Тест endpoint: http://localhost:${PORT}/test-referral-stats/48`);
  console.log('⏰ Время запуска:', new Date().toISOString());
});