/**
 * Диагностика TON Boost начислений для рефералов
 */

import { supabase } from '../core/supabase';

async function checkTonBoostReferrals() {
  console.log('\n' + '='.repeat(80));
  console.log('ДИАГНОСТИКА TON BOOST НАЧИСЛЕНИЙ ДЛЯ РЕФЕРАЛОВ');
  console.log('='.repeat(80) + '\n');
  
  const referrerId = 184;
  const referralIds = [186, 187, 188, 189, 190];
  
  try {
    // 1. Проверяем TON farming данные рефералов
    console.log('1. TON FARMING ДАННЫЕ РЕФЕРАЛОВ:');
    const { data: tonFarmingData, error: tonError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .in('user_id', referralIds.map(String));
    
    if (tonError) {
      console.error('Ошибка чтения ton_farming_data:', tonError);
    } else {
      console.log(`Найдено ${tonFarmingData?.length || 0} записей TON farming:`);
      tonFarmingData?.forEach(t => {
        console.log(`\n  User ${t.user_id}:`);
        console.log(`    - farming_balance: ${t.farming_balance} TON`);
        console.log(`    - farming_rate: ${t.farming_rate}`);
        console.log(`    - boost_package_id: ${t.boost_package_id}`);
        console.log(`    - farming_start_timestamp: ${t.farming_start_timestamp}`);
        console.log(`    - farming_last_update: ${t.farming_last_update}`);
        
        if (t.farming_last_update) {
          const lastUpdate = new Date(t.farming_last_update);
          const now = new Date();
          const minutesAgo = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
          console.log(`    - Последнее обновление: ${minutesAgo} минут назад`);
        }
      });
    }
    
    // 2. Проверяем TON farming транзакции рефералов за последние 24 часа
    console.log('\n\n2. TON FARMING ТРАНЗАКЦИИ РЕФЕРАЛОВ (последние 24 часа):');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: tonTransactions } = await supabase
      .from('transactions')
      .select('*')
      .in('user_id', referralIds)
      .eq('currency', 'TON')
      .eq('type', 'FARMING_REWARD')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false });
    
    console.log(`Найдено ${tonTransactions?.length || 0} TON farming транзакций:`);
    tonTransactions?.forEach(tx => {
      console.log(`  - User ${tx.user_id}: ${tx.amount} TON (${new Date(tx.created_at).toLocaleString()})`);
    });
    
    // 3. Проверяем реферальные TON награды для User 184
    console.log('\n\n3. РЕФЕРАЛЬНЫЕ TON НАГРАДЫ ДЛЯ USER 184:');
    const { data: tonReferralRewards } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', referrerId)
      .eq('type', 'REFERRAL_REWARD')
      .eq('currency', 'TON')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false });
    
    console.log(`Найдено ${tonReferralRewards?.length || 0} TON реферальных наград за 24 часа:`);
    tonReferralRewards?.forEach(tx => {
      console.log(`  - ${tx.amount} TON от User ${tx.source_user_id} (${new Date(tx.created_at).toLocaleString()})`);
      console.log(`    Описание: ${tx.description}`);
    });
    
    // 4. Проверяем последние TON транзакции ЛЮБОГО типа для рефералов
    console.log('\n\n4. ПОСЛЕДНИЕ TON ТРАНЗАКЦИИ РЕФЕРАЛОВ (любого типа):');
    const { data: allTonTx } = await supabase
      .from('transactions')
      .select('*')
      .in('user_id', referralIds)
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(20);
    
    console.log(`Найдено ${allTonTx?.length || 0} TON транзакций:`);
    const txByType: Record<string, number> = {};
    allTonTx?.forEach(tx => {
      txByType[tx.type] = (txByType[tx.type] || 0) + 1;
    });
    
    console.log('\nТипы транзакций:');
    Object.entries(txByType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count} транзакций`);
    });
    
    if (allTonTx && allTonTx.length > 0) {
      console.log('\nПоследние 5 TON транзакций:');
      allTonTx.slice(0, 5).forEach(tx => {
        console.log(`  - User ${tx.user_id}: ${tx.amount} TON, тип: ${tx.type} (${new Date(tx.created_at).toLocaleString()})`);
      });
    }
    
    // 5. Проверяем есть ли вообще TON Boost награды в системе
    console.log('\n\n5. ПРОВЕРКА TON BOOST НАГРАД В СИСТЕМЕ:');
    const { data: anyTonFarmingRewards, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .gte('created_at', oneDayAgo)
      .limit(10);
    
    console.log(`Всего TON FARMING_REWARD транзакций за 24 часа: ${count || 0}`);
    if (anyTonFarmingRewards && anyTonFarmingRewards.length > 0) {
      console.log('Примеры:');
      anyTonFarmingRewards.forEach(tx => {
        console.log(`  - User ${tx.user_id}: ${tx.amount} TON (${new Date(tx.created_at).toLocaleString()})`);
      });
    }
    
    // 6. Анализ проблемы
    console.log('\n\n6. АНАЛИЗ ПРОБЛЕМЫ:');
    
    const activeTonFarmers = tonFarmingData?.filter(t => t.farming_balance > 0) || [];
    const hasRecentTonTx = tonTransactions && tonTransactions.length > 0;
    const hasReferralTonRewards = tonReferralRewards && tonReferralRewards.length > 0;
    
    if (activeTonFarmers.length === 0) {
      console.log('\n❌ ПРОБЛЕМА: Ваши рефералы НЕ имеют активных TON депозитов!');
    } else if (!hasRecentTonTx) {
      console.log('\n❌ ПРОБЛЕМА: TON Boost планировщик НЕ РАБОТАЕТ!');
      console.log(`   ${activeTonFarmers.length} рефералов имеют депозиты, но нет начислений.`);
      console.log('   Это объясняет отсутствие реферальных TON наград.');
    } else if (!hasReferralTonRewards) {
      console.log('\n⚠️  ПРОБЛЕМА: Рефералы получают TON награды, но вы не получаете реферальные!');
      console.log('   Возможно, проблема в расчете реферальных процентов.');
    } else {
      console.log('\n✅ Система работает нормально.');
    }
    
    // 7. Проверяем расчет дохода для одного реферала
    if (activeTonFarmers.length > 0) {
      console.log('\n\n7. РАСЧЕТ ОЖИДАЕМОГО ДОХОДА:');
      const farmer = activeTonFarmers[0];
      const dailyRate = 0.01; // 1% в день
      const hourlyIncome = (farmer.farming_balance * dailyRate / 24);
      const fiveMinIncome = hourlyIncome / 12;
      const referralReward = fiveMinIncome * 0.05; // 5% реферальная награда
      
      console.log(`Для User ${farmer.user_id} с депозитом ${farmer.farming_balance} TON:`);
      console.log(`  - Доход за 5 минут: ${fiveMinIncome.toFixed(8)} TON`);
      console.log(`  - Ваша реферальная награда (5%): ${referralReward.toFixed(8)} TON`);
      console.log(`  - За час вы должны получить: ${(referralReward * 12).toFixed(8)} TON`);
      console.log(`  - За сутки: ${(referralReward * 288).toFixed(8)} TON`);
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('ДИАГНОСТИКА ЗАВЕРШЕНА');
  console.log('='.repeat(80) + '\n');
  
  process.exit(0);
}

checkTonBoostReferrals();