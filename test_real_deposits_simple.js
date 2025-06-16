/**
 * T63 - Упрощенное тестирование реальных депозитов UNI
 * Проверка фактических начислений от farming с реальными токенами
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Проверяет реальные депозиты пользователей
 */
async function checkRealDeposits() {
  console.log('=== АНАЛИЗ РЕАЛЬНЫХ ДЕПОЗИТОВ ===');
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, balance_ton, uni_farming_rate, referred_by')
    .gt('uni_farming_rate', 0)
    .order('id');
    
  if (error) {
    console.error('Ошибка получения пользователей:', error);
    return [];
  }
  
  console.log('\nПользователи с активными UNI депозитами:');
  users.forEach(user => {
    console.log(`ID ${user.id} (${user.telegram_id}): ${user.balance_uni} UNI, rate: ${user.uni_farming_rate}, referrer: ${user.referred_by || 'none'}`);
  });
  
  return users;
}

/**
 * Симулирует один цикл UNI farming income
 */
async function simulateRealFarmingCycle(users) {
  console.log('\n=== СИМУЛЯЦИЯ UNI FARMING ЦИКЛА ===');
  
  const results = [];
  
  for (const user of users) {
    // Рассчитываем доход за 5 минут (стандартный интервал)
    const farmingRate = parseFloat(user.uni_farming_rate);
    const income = farmingRate * (5 / 60); // 5 минут из 60 в часе
    const currentBalance = parseFloat(user.balance_uni);
    const newBalance = currentBalance + income;
    
    console.log(`User ID ${user.id}: +${income.toFixed(6)} UNI (${currentBalance.toFixed(6)} → ${newBalance.toFixed(6)})`);
    
    // Обновляем баланс в базе данных
    const { error } = await supabase
      .from('users')
      .update({ balance_uni: newBalance.toFixed(6) })
      .eq('id', user.id);
      
    if (error) {
      console.error(`Ошибка обновления баланса User ID ${user.id}:`, error);
      continue;
    }
    
    results.push({
      userId: user.id,
      income: income,
      newBalance: newBalance,
      referrerId: user.referred_by
    });
    
    // Создаем транзакцию farming дохода
    await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'FARMING_REWARD',
        amount: income.toFixed(6),
        currency: 'UNI',
        status: 'completed',
        description: `UNI farming income (rate: ${farmingRate})`
      });
  }
  
  return results;
}

/**
 * Обрабатывает реферальные начисления от реального farming дохода
 */
async function processReferralRewards(farmingResults) {
  console.log('\n=== РЕФЕРАЛЬНЫЕ НАЧИСЛЕНИЯ ===');
  
  for (const result of farmingResults) {
    if (!result.referrerId) {
      console.log(`User ID ${result.userId}: нет реферера`);
      continue;
    }
    
    // Рассчитываем реферальную комиссию (1 уровень = 100% от дохода)
    const referralReward = result.income * 1.0; // 100% для первого уровня
    
    // Получаем реферера
    const { data: referrer, error } = await supabase
      .from('users')
      .select('id, balance_uni, username')
      .eq('id', result.referrerId)
      .single();
      
    if (error || !referrer) {
      console.log(`User ID ${result.userId}: реферер ID ${result.referrerId} не найден`);
      continue;
    }
    
    const currentReferrerBalance = parseFloat(referrer.balance_uni);
    const newReferrerBalance = currentReferrerBalance + referralReward;
    
    console.log(`User ID ${result.userId} → Referrer ID ${result.referrerId}: +${referralReward.toFixed(6)} UNI`);
    console.log(`  Referrer ${referrer.username}: ${currentReferrerBalance.toFixed(6)} → ${newReferrerBalance.toFixed(6)} UNI`);
    
    // Обновляем баланс реферера
    await supabase
      .from('users')
      .update({ balance_uni: newReferrerBalance.toFixed(6) })
      .eq('id', result.referrerId);
      
    // Создаем транзакцию реферального вознаграждения
    await supabase
      .from('transactions')
      .insert({
        user_id: result.referrerId,
        type: 'REFERRAL_REWARD',
        amount: referralReward.toFixed(6),
        currency: 'UNI',
        status: 'completed',
        description: `Referral reward from User ID ${result.userId} farming`
      });
  }
}

/**
 * Основная функция тестирования
 */
async function runRealDepositsTest() {
  try {
    console.log('T63 - ТЕСТИРОВАНИЕ РЕАЛЬНЫХ UNI ДЕПОЗИТОВ');
    console.log('='.repeat(60));
    
    // 1. Получаем пользователей с активными депозитами
    const activeUsers = await checkRealDeposits();
    
    if (activeUsers.length === 0) {
      console.log('❌ Нет пользователей с активными UNI депозитами');
      return;
    }
    
    console.log(`\n🔄 Найдено ${activeUsers.length} пользователей с активным UNI farming`);
    
    // 2. Симулируем цикл farming с реальными депозитами
    const farmingResults = await simulateRealFarmingCycle(activeUsers);
    
    // 3. Обрабатываем реферальные начисления
    await processReferralRewards(farmingResults);
    
    // 4. Показываем итоговую статистику
    console.log('\n=== ИТОГОВАЯ СТАТИСТИКА ===');
    const totalIncome = farmingResults.reduce((sum, r) => sum + r.income, 0);
    console.log(`Общий доход от farming: ${totalIncome.toFixed(6)} UNI`);
    console.log(`Пользователей с реферерами: ${farmingResults.filter(r => r.referrerId).length}`);
    
    console.log('\n✅ T63 COMPLETED: Тестирование реальных депозитов завершено');
    
  } catch (error) {
    console.error('❌ T63 ERROR:', error.message);
  }
}

// Запуск тестирования
runRealDepositsTest();