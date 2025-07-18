/**
 * Тест фарминг планировщика с проверкой реферальных наград
 */

import { FarmingScheduler } from '../core/scheduler/farmingScheduler';
import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

async function testFarmingWithReferrals() {
  console.log('\n' + '='.repeat(80));
  console.log('ТЕСТ ФАРМИНГ ПЛАНИРОВЩИКА С РЕФЕРАЛЬНЫМИ НАГРАДАМИ');
  console.log('='.repeat(80) + '\n');
  
  try {
    // Получаем активных фармеров с рефералами перед тестом
    console.log('1. Проверяем активных фармеров с рефералами...');
    const { data: farmersWithRefs } = await supabase
      .from('users')
      .select('id, username, referred_by, uni_deposit_amount, balance_uni')
      .eq('uni_farming_active', true)
      .not('referred_by', 'is', null)
      .order('id');
    
    console.log(`Найдено ${farmersWithRefs?.length || 0} активных фармеров с рефералами:`);
    farmersWithRefs?.forEach(f => {
      console.log(`  - User ${f.id} (депозит: ${f.uni_deposit_amount}, баланс: ${f.balance_uni?.toFixed(2)}, реферер: ${f.referred_by})`);
    });
    
    // Сохраняем начальные балансы рефереров
    const referrerBalances: { [key: string]: number } = {};
    if (farmersWithRefs) {
      for (const farmer of farmersWithRefs) {
        if (farmer.referred_by) {
          const { data: referrer } = await supabase
            .from('users')
            .select('id, balance_uni')
            .eq('id', farmer.referred_by)
            .single();
          
          if (referrer && !referrerBalances[referrer.id]) {
            referrerBalances[referrer.id] = referrer.balance_uni;
          }
        }
      }
    }
    
    console.log('\n2. Начальные балансы рефереров:');
    Object.entries(referrerBalances).forEach(([id, balance]) => {
      console.log(`  - User ${id}: ${balance.toFixed(2)} UNI`);
    });
    
    // Запускаем процесс фарминга напрямую
    console.log('\n3. Запускаем процесс фарминга...');
    const scheduler = new FarmingScheduler();
    
    // Вызываем приватный метод напрямую (для теста)
    await (scheduler as any).processUniFarmingIncome();
    
    console.log('\n4. Ждем 3 секунды для завершения всех операций...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Проверяем новые транзакции
    console.log('\n5. Проверяем новые транзакции...');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: newTransactions } = await supabase
      .from('transactions')
      .select('*')
      .in('type', ['FARMING_REWARD', 'REFERRAL_REWARD'])
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false });
    
    if (newTransactions) {
      const farmingRewards = newTransactions.filter(t => t.type === 'FARMING_REWARD');
      const referralRewards = newTransactions.filter(t => t.type === 'REFERRAL_REWARD');
      
      console.log(`\n✓ Создано ${farmingRewards.length} FARMING_REWARD транзакций`);
      console.log(`✓ Создано ${referralRewards.length} REFERRAL_REWARD транзакций`);
      
      if (referralRewards.length > 0) {
        console.log('\nДетали реферальных наград:');
        referralRewards.forEach(r => {
          console.log(`  - User ${r.user_id} получил ${r.amount} ${r.currency} от User ${r.source_user_id}`);
        });
      }
    }
    
    // Проверяем изменения балансов рефереров
    console.log('\n6. Проверяем новые балансы рефереров:');
    for (const [referrerId, oldBalance] of Object.entries(referrerBalances)) {
      const { data: referrer } = await supabase
        .from('users')
        .select('id, balance_uni')
        .eq('id', parseInt(referrerId))
        .single();
      
      if (referrer) {
        const newBalance = referrer.balance_uni;
        const difference = newBalance - oldBalance;
        console.log(`  - User ${referrerId}: ${newBalance.toFixed(2)} UNI (${difference > 0 ? '+' : ''}${difference.toFixed(6)} UNI)`);
      }
    }
    
    // Проверяем таблицу referral_earnings
    console.log('\n7. Проверяем записи в referral_earnings:');
    const { data: earnings, count } = await supabase
      .from('referral_earnings')
      .select('*', { count: 'exact' })
      .gte('created_at', fiveMinutesAgo);
    
    console.log(`✓ Создано ${count || 0} записей в referral_earnings`);
    if (earnings && earnings.length > 0) {
      earnings.forEach(e => {
        console.log(`  - User ${e.user_id} получил ${e.amount} ${e.currency} от User ${e.source_user_id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('ТЕСТ ЗАВЕРШЕН');
  console.log('='.repeat(80) + '\n');
  
  process.exit(0);
}

testFarmingWithReferrals();