/**
 * Проверка последних реферальных наград
 */

import { supabase } from '../core/supabase';

async function checkLatestReferralRewards() {
  console.log('\n' + '='.repeat(80));
  console.log('ПРОВЕРКА ПОСЛЕДНИХ РЕФЕРАЛЬНЫХ НАГРАД');
  console.log('='.repeat(80) + '\n');
  
  try {
    // Проверяем последние транзакции рефералов
    const referralIds = [186, 187, 188, 189, 190];
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    // 1. Проверяем UNI farming транзакции рефералов
    console.log('1. UNI FARMING ТРАНЗАКЦИИ РЕФЕРАЛОВ (последние 10 минут):');
    const { data: farmingTx } = await supabase
      .from('transactions')
      .select('*')
      .in('user_id', referralIds)
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'UNI')
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false });
    
    if (farmingTx && farmingTx.length > 0) {
      farmingTx.forEach(tx => {
        console.log(`  ✅ User ${tx.user_id}: +${tx.amount} UNI (${new Date(tx.created_at).toLocaleTimeString()})`);
      });
    } else {
      console.log('  ❌ Нет транзакций');
    }
    
    // 2. Проверяем реферальные награды для User 184
    console.log('\n2. РЕФЕРАЛЬНЫЕ НАГРАДЫ USER 184 (последние 10 минут):');
    const { data: referralRewards } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 184)
      .eq('type', 'REFERRAL_REWARD')
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false });
    
    if (referralRewards && referralRewards.length > 0) {
      let totalUNI = 0;
      let totalTON = 0;
      
      referralRewards.forEach(tx => {
        console.log(`  ✅ ${tx.amount} ${tx.currency} от ${tx.metadata?.source_user_id || 'User ' + tx.description?.match(/User (\d+)/)?.[1]} (${new Date(tx.created_at).toLocaleTimeString()})`);
        
        if (tx.currency === 'UNI') totalUNI += parseFloat(tx.amount);
        if (tx.currency === 'TON') totalTON += parseFloat(tx.amount);
      });
      
      console.log(`\n  Итого получено:`);
      if (totalUNI > 0) console.log(`  - UNI: ${totalUNI.toFixed(6)}`);
      if (totalTON > 0) console.log(`  - TON: ${totalTON.toFixed(8)}`);
    } else {
      console.log('  ❌ Нет реферальных наград');
    }
    
    // 3. Проверяем обновление uni_farming_last_update
    console.log('\n3. СТАТУС ОБНОВЛЕНИЯ РЕФЕРАЛОВ:');
    const { data: referrals } = await supabase
      .from('users')
      .select('id, username, uni_farming_last_update, uni_deposit_amount')
      .in('id', referralIds)
      .order('id');
    
    let updatedCount = 0;
    referrals?.forEach(user => {
      const lastUpdate = user.uni_farming_last_update ? new Date(user.uni_farming_last_update) : null;
      const minutesAgo = lastUpdate ? Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60)) : 999;
      
      if (minutesAgo < 10) {
        console.log(`  ✅ User ${user.id}: обновлен ${minutesAgo} мин назад`);
        updatedCount++;
      } else {
        console.log(`  ❌ User ${user.id}: не обновлялся ${minutesAgo} мин`);
      }
    });
    
    // 4. Проверяем таблицу uni_farming_data
    console.log('\n4. СТАТУС В ТАБЛИЦЕ UNI_FARMING_DATA:');
    const { data: farmingData } = await supabase
      .from('uni_farming_data')
      .select('user_id, is_active, deposit_amount, farming_last_update')
      .in('user_id', referralIds)
      .order('user_id');
    
    farmingData?.forEach(record => {
      const lastUpdate = record.farming_last_update ? new Date(record.farming_last_update) : null;
      const minutesAgo = lastUpdate ? Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60)) : 999;
      
      console.log(`  - User ${record.user_id}: active=${record.is_active}, deposit=${record.deposit_amount}, обновлен ${minutesAgo} мин назад`);
    });
    
    // Итоговый анализ
    console.log('\n' + '-'.repeat(80));
    console.log('АНАЛИЗ:');
    
    if (updatedCount === 0) {
      console.log('❌ Рефералы НЕ обрабатываются планировщиком UNI farming');
      console.log('Возможная причина: планировщик не обновляет данные в таблице users');
    } else if (updatedCount < referralIds.length) {
      console.log(`⚠️  Только ${updatedCount} из ${referralIds.length} рефералов обрабатываются`);
    } else {
      console.log('✅ Все рефералы обрабатываются планировщиком');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
  
  process.exit(0);
}

checkLatestReferralRewards();