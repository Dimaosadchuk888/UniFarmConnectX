/**
 * Проверка последнего цикла фарминга и реферальных наград
 */

import { supabase } from '../core/supabase';

async function checkLastFarmingCycle() {
  console.log('\n' + '='.repeat(80));
  console.log('ПРОВЕРКА ПОСЛЕДНЕГО ЦИКЛА ФАРМИНГА');
  console.log('='.repeat(80) + '\n');
  
  try {
    // Получаем последние FARMING_REWARD транзакции
    console.log('1. Последние FARMING_REWARD транзакции (10 минут):');
    console.log('-'.repeat(40));
    
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: farmingRewards } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false });
    
    if (!farmingRewards || farmingRewards.length === 0) {
      console.log('❌ Нет FARMING_REWARD транзакций за последние 10 минут');
      return;
    }
    
    console.log(`✓ Найдено ${farmingRewards.length} FARMING_REWARD транзакций\n`);
    
    // Группируем по времени создания (циклам)
    const cycles: { [key: string]: any[] } = {};
    farmingRewards.forEach(tx => {
      const cycleTime = new Date(tx.created_at);
      cycleTime.setSeconds(0, 0); // Округляем до минуты
      const cycleKey = cycleTime.toISOString();
      
      if (!cycles[cycleKey]) cycles[cycleKey] = [];
      cycles[cycleKey].push(tx);
    });
    
    console.log(`Найдено ${Object.keys(cycles).length} циклов фарминга:\n`);
    
    // Анализируем последний цикл
    const lastCycleKey = Object.keys(cycles).sort().reverse()[0];
    const lastCycle = cycles[lastCycleKey];
    
    console.log(`Последний цикл: ${new Date(lastCycleKey).toLocaleTimeString()}`);
    console.log(`Транзакций в цикле: ${lastCycle.length}\n`);
    
    // Проверяем каждого фармера из последнего цикла
    console.log('2. Анализ фармеров из последнего цикла:');
    console.log('-'.repeat(40));
    
    for (const farmingTx of lastCycle.slice(0, 5)) { // Берем первые 5 для примера
      const { data: farmer } = await supabase
        .from('users')
        .select('id, username, referred_by')
        .eq('id', farmingTx.user_id)
        .single();
      
      console.log(`\nUser ${farmingTx.user_id} (${farmer?.username}):`);
      console.log(`  - Farming reward: ${farmingTx.amount} UNI`);
      console.log(`  - Приглашен: ${farmer?.referred_by ? `User ${farmer.referred_by}` : 'Никем'}`);
      
      if (farmer?.referred_by) {
        // Проверяем реферальные транзакции для этого фармера
        const checkTimeStart = new Date(farmingTx.created_at);
        const checkTimeEnd = new Date(checkTimeStart.getTime() + 60000); // +1 минута
        
        const { data: referralTx } = await supabase
          .from('transactions')
          .select('*')
          .eq('type', 'REFERRAL_REWARD')
          .eq('source_user_id', farmingTx.user_id)
          .gte('created_at', checkTimeStart.toISOString())
          .lte('created_at', checkTimeEnd.toISOString());
        
        if (referralTx && referralTx.length > 0) {
          console.log(`  ✅ Найдены реферальные награды:`);
          referralTx.forEach(rtx => {
            console.log(`     - User ${rtx.user_id} получил ${rtx.amount} ${rtx.currency}`);
          });
        } else {
          console.log(`  ⚠️ Реферальные награды НЕ найдены`);
        }
      }
    }
    
    // Проверяем все REFERRAL_REWARD транзакции за последние 10 минут
    console.log('\n\n3. Все REFERRAL_REWARD транзакции (10 минут):');
    console.log('-'.repeat(40));
    
    const { data: allReferralRewards } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false });
    
    if (allReferralRewards && allReferralRewards.length > 0) {
      console.log(`✓ Найдено ${allReferralRewards.length} REFERRAL_REWARD транзакций:\n`);
      
      allReferralRewards.forEach(rtx => {
        console.log(`  - ${new Date(rtx.created_at).toLocaleTimeString()}: User ${rtx.user_id} получил ${rtx.amount} ${rtx.currency} от User ${rtx.source_user_id || 'unknown'}`);
      });
    } else {
      console.log('❌ Нет REFERRAL_REWARD транзакций за последние 10 минут');
    }
    
    // Итоговая статистика
    console.log('\n\n4. ИТОГОВАЯ СТАТИСТИКА:');
    console.log('-'.repeat(40));
    
    const farmersWithRefs = lastCycle.filter(async (tx: any) => {
      const { data } = await supabase
        .from('users')
        .select('referred_by')
        .eq('id', tx.user_id)
        .single();
      return data?.referred_by;
    });
    
    console.log(`Фармеров в последнем цикле: ${lastCycle.length}`);
    console.log(`Из них с рефералами: ${farmersWithRefs.length}`);
    console.log(`REFERRAL_REWARD транзакций: ${allReferralRewards?.length || 0}`);
    
    if (farmersWithRefs.length > 0 && (!allReferralRewards || allReferralRewards.length === 0)) {
      console.log('\n⚠️ ПРОБЛЕМА: Есть фармеры с рефералами, но нет реферальных наград!');
    } else if (allReferralRewards && allReferralRewards.length > 0) {
      console.log('\n✅ Реферальная система работает корректно!');
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('ПРОВЕРКА ЗАВЕРШЕНА');
  console.log('='.repeat(80) + '\n');
}

checkLastFarmingCycle();