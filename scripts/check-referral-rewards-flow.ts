/**
 * Проверка потока начисления реферальных наград
 */

import { supabase } from '../core/supabase';
import { ReferralService } from '../modules/referral/service';
import { logger } from '../core/logger';

async function checkReferralRewardsFlow() {
  console.log('\n' + '='.repeat(80));
  console.log('ПРОВЕРКА ПОТОКА НАЧИСЛЕНИЯ РЕФЕРАЛЬНЫХ НАГРАД');
  console.log('='.repeat(80) + '\n');
  
  const referralService = new ReferralService();
  
  try {
    // Берем пользователя с рефералом для теста
    console.log('1. Выбираем тестового пользователя с рефералом...');
    const { data: userWithRef } = await supabase
      .from('users')
      .select('id, username, referred_by, uni_deposit_amount')
      .not('referred_by', 'is', null)
      .eq('uni_farming_active', true)
      .gt('uni_deposit_amount', 0)
      .limit(1)
      .single();
    
    if (!userWithRef) {
      console.log('❌ Нет активных фармеров с рефералами');
      return;
    }
    
    console.log(`✓ Выбран User ${userWithRef.id} (депозит: ${userWithRef.uni_deposit_amount} UNI)`);
    console.log(`  Приглашен пользователем: ${userWithRef.referred_by}`);
    
    // Проверяем цепочку рефереров
    console.log('\n2. Проверяем цепочку рефереров...');
    const referrerChain = await referralService.buildReferrerChain(userWithRef.id.toString());
    console.log(`✓ Цепочка рефереров: [${referrerChain.join(' → ')}]`);
    
    // Тестовое начисление
    const testAmount = '10';
    console.log(`\n3. Тестируем начисление ${testAmount} UNI...`);
    
    // Вызываем distributeReferralRewards напрямую
    console.log('Вызываем distributeReferralRewards...');
    const result = await referralService.distributeReferralRewards(
      userWithRef.id.toString(),
      testAmount,
      'UNI',
      'farming'
    );
    
    console.log('\nРезультат distributeReferralRewards:');
    console.log(`  success: ${result.success}`);
    console.log(`  distributed: ${result.distributed}`);
    console.log(`  totalAmount: ${result.totalAmount}`);
    
    // Проверяем, появились ли записи
    console.log('\n4. Проверяем таблицу referral_earnings...');
    const { data: newEarnings, count } = await supabase
      .from('referral_earnings')
      .select('*', { count: 'exact' })
      .eq('source_user_id', userWithRef.id)
      .order('created_at', { ascending: false });
    
    console.log(`✓ Найдено записей для User ${userWithRef.id}: ${count || 0}`);
    
    if (newEarnings && newEarnings.length > 0) {
      console.log('\nДетали начислений:');
      newEarnings.forEach(earn => {
        console.log(`  - User ${earn.user_id} получил ${earn.amount} ${earn.currency} (уровень ${earn.level})`);
      });
    }
    
    // Проверяем константы комиссий
    console.log('\n5. Проверяем константы реферальных комиссий...');
    const commissionRates = {
      1: 0.05,   // 5%
      2: 0.03,   // 3%
      3: 0.02,   // 2%
      4: 0.015,  // 1.5%
      5: 0.01,   // 1%
      6: 0.009,  // 0.9%
      7: 0.008,  // 0.8%
      8: 0.007,  // 0.7%
      9: 0.006,  // 0.6%
      10: 0.005, // 0.5%
      11: 0.004, // 0.4%
      12: 0.003, // 0.3%
      13: 0.0025,// 0.25%
      14: 0.002, // 0.2%
      15: 0.0015,// 0.15%
      16: 0.001, // 0.1%
      17: 0.001, // 0.1%
      18: 0.001, // 0.1%
      19: 0.001, // 0.1%
      20: 0.001  // 0.1%
    };
    
    console.log('Первые 5 уровней:');
    for (let i = 1; i <= 5; i++) {
      console.log(`  Уровень ${i}: ${(commissionRates[i as keyof typeof commissionRates] * 100).toFixed(1)}%`);
    }
    
    // Рассчитаем ожидаемые комиссии
    if (referrerChain.length > 0) {
      console.log('\n6. Ожидаемые комиссии от 100 UNI:');
      let totalExpected = 0;
      for (let i = 0; i < Math.min(referrerChain.length, 20); i++) {
        const level = i + 1;
        const rate = commissionRates[level as keyof typeof commissionRates] || 0;
        const commission = 100 * rate;
        totalExpected += commission;
        console.log(`  Уровень ${level} (User ${referrerChain[i]}): ${commission.toFixed(2)} UNI (${(rate * 100).toFixed(1)}%)`);
      }
      console.log(`  Итого: ${totalExpected.toFixed(2)} UNI`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('ПРОВЕРКА ЗАВЕРШЕНА');
  console.log('='.repeat(80) + '\n');
}

checkReferralRewardsFlow();