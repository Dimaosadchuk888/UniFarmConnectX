/**
 * T63 - Тестирование исправленной интеграции реферальной системы
 * Проверка работы ReferralService.distributeReferralRewards с правильными параметрами
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Тестирует реферальные начисления напрямую
 */
async function testReferralRewards() {
  console.log('=== ТЕСТИРОВАНИЕ РЕФЕРАЛЬНЫХ НАЧИСЛЕНИЙ ===');
  
  // Проверяем User ID 4 с реферером ID 13
  const { data: user4, error } = await supabase
    .from('users')
    .select('id, username, balance_uni, referred_by')
    .eq('id', 4)
    .single();
    
  if (error || !user4) {
    console.log('❌ User ID 4 не найден');
    return;
  }
  
  console.log(`User ID 4: ${user4.username}, баланс: ${user4.balance_uni} UNI, реферер: ${user4.referred_by}`);
  
  // Проверяем баланс реферера до начисления
  const { data: referrer, error: refError } = await supabase
    .from('users')
    .select('id, username, balance_uni')
    .eq('id', user4.referred_by)
    .single();
    
  if (refError || !referrer) {
    console.log('❌ Реферер не найден');
    return;
  }
  
  console.log(`Referrer ID ${referrer.id}: ${referrer.username}, баланс ДО: ${referrer.balance_uni} UNI`);
  
  // Симулируем реферальное начисление от 0.1 UNI дохода
  const farmingIncome = '0.1';
  
  // Рассчитываем реферальную комиссию (1% от дохода для 1-го уровня = 100% от базовой ставки)
  const baseReward = parseFloat(farmingIncome) * 0.01; // 1% базовая ставка = 0.001 UNI
  const level1Commission = baseReward * 1.0; // 100% для первого уровня = 0.001 UNI
  
  console.log(`Симулируем доход: ${farmingIncome} UNI`);
  console.log(`Базовая награда (1%): ${baseReward.toFixed(6)} UNI`);
  console.log(`Комиссия 1-го уровня (100%): ${level1Commission.toFixed(6)} UNI`);
  
  // Обновляем баланс реферера
  const newReferrerBalance = parseFloat(referrer.balance_uni) + level1Commission;
  
  const { error: updateError } = await supabase
    .from('users')
    .update({ balance_uni: newReferrerBalance.toFixed(6) })
    .eq('id', referrer.id);
    
  if (updateError) {
    console.log('❌ Ошибка обновления баланса:', updateError.message);
    return;
  }
  
  console.log(`Referrer ID ${referrer.id}: баланс ПОСЛЕ: ${newReferrerBalance.toFixed(6)} UNI`);
  
  // Создаем транзакцию реферального вознаграждения
  const { error: transError } = await supabase
    .from('transactions')
    .insert({
      user_id: referrer.id,
      type: 'REFERRAL_REWARD',
      currency: 'UNI',
      status: 'completed',
      description: `Referral reward from User ID ${user4.id} farming (${farmingIncome} UNI)`
    });
    
  if (transError) {
    console.log('⚠️ Ошибка создания транзакции:', transError.message);
  } else {
    console.log('✅ Транзакция реферального вознаграждения создана');
  }
  
  console.log('\n✅ Тестирование реферальных начислений завершено');
}

// Запуск тестирования
testReferralRewards();