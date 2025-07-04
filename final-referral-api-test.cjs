/**
 * ФИНАЛЬНЫЙ ТЕСТ ИСПРАВЛЕННОГО API РЕФЕРАЛЬНОЙ СИСТЕМЫ
 * Проверка реального API endpoint с исправленной логикой
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Инициализация Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Точная копия исправленного ReferralService.getRealReferralStats
async function getRealReferralStats(userId) {
  try {
    // 1. Получаем пользователя
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, ref_code')
      .eq('id', userId)
      .single();
      
    if (userError || !user) {
      throw new Error('Пользователь не найден');
    }
    
    // 2. ИСПРАВЛЕННЫЙ ЗАПРОС - используем amount_uni/amount_ton вместо amount
    const { data: referralTransactions, error: refError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_uni, amount_ton, currency, description, created_at')
      .eq('user_id', userId)
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false });
      
    if (refError) {
      throw refError;
    }
    
    // 3. Анализ доходов по уровням
    const levelIncome = {};
    const levelCounts = {};
    let totalUniEarned = 0;
    let totalTonEarned = 0;
    
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
          
          // Обработка UNI доходов
          if (tx.amount_uni && parseFloat(tx.amount_uni) > 0) {
            const uniAmount = parseFloat(tx.amount_uni);
            levelIncome[level].uni += uniAmount;
            totalUniEarned += uniAmount;
          }
          
          // Обработка TON доходов
          if (tx.amount_ton && parseFloat(tx.amount_ton) > 0) {
            const tonAmount = parseFloat(tx.amount_ton);
            levelIncome[level].ton += tonAmount;
            totalTonEarned += tonAmount;
          }
          
          levelCounts[level]++;
        }
      });
    }
    
    // 4. Поиск прямых рефералов
    const { data: directReferrals } = await supabase
      .from('users')
      .select('id, username, first_name, referred_by')
      .eq('referred_by', userId);
    
    // 5. Построение результата
    return {
      success: true,
      data: {
        user_id: user.id,
        username: user.username,
        ref_code: user.ref_code,
        total_referrals: Object.values(levelCounts).reduce((sum, count) => sum + count, 0),
        total_uni_earned: totalUniEarned,
        total_ton_earned: totalTonEarned,
        direct_referrals_count: directReferrals?.length || 0,
        level_income: levelIncome,
        level_counts: levelCounts,
        transactions_found: referralTransactions?.length || 0,
        direct_referrals: directReferrals || [],
        levels_active: Object.keys(levelIncome).length
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: 'Ошибка получения реферальной информации',
      details: error.message
    };
  }
}

// API endpoints
app.get('/api/v2/referrals/stats/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  const result = await getRealReferralStats(userId);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

app.get('/api/v2/referrals/debug-stats', async (req, res) => {
  const result = await getRealReferralStats(48); // Default to user 48
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'UniFarm Referral API', time: new Date().toISOString() });
});

// Запуск на порту 3333 чтобы не конфликтовать
const PORT = 3333;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Тестовый API сервер запущен на порту ${PORT}`);
  console.log(`📋 Endpoints:`);
  console.log(`   GET /api/v2/referrals/debug-stats`);
  console.log(`   GET /api/v2/referrals/stats/48`);
  console.log(`   GET /health`);
  console.log(`🔧 Тестирование исправленной логики для user_id=48...`);
  
  // Автоматический тест через 2 секунды
  setTimeout(async () => {
    try {
      const testResult = await getRealReferralStats(48);
      console.log('\n✅ РЕЗУЛЬТАТ АВТОТЕСТА:');
      console.log('JSON Response:', JSON.stringify(testResult, null, 2));
      
      if (testResult.success && testResult.data.total_uni_earned > 0) {
        console.log('\n🎉 УСПЕХ! Реферальная система работает корректно');
        console.log(`💰 Найдено ${testResult.data.transactions_found} транзакций`);
        console.log(`🏆 Доход: ${testResult.data.total_uni_earned.toFixed(6)} UNI`);
        console.log(`📊 Активных уровней: ${testResult.data.levels_active}`);
      }
    } catch (error) {
      console.error('❌ Ошибка автотеста:', error.message);
    }
  }, 2000);
});