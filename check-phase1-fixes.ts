/**
 * Phase 1 Fix Verification Script
 * Проверяет все исправления, внесенные в Phase 1
 */

import { supabase } from './core/supabase.js';

console.log('🔍 Проверка исправлений Phase 1...\n');

async function checkPhase1Fixes() {
  // 1. Проверка последних BOOST_PURCHASE транзакций
  console.log('1️⃣ Проверка BOOST_PURCHASE транзакций (double parseFloat fix)...');
  const { data: boostTransactions, error: boostError } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'BOOST_PURCHASE')
    .order('created_at', { ascending: false })
    .limit(5);

  if (boostError) {
    console.error('❌ Ошибка запроса транзакций:', boostError);
  } else {
    console.log(`✅ Найдено ${boostTransactions?.length} BOOST_PURCHASE транзакций`);
    boostTransactions?.forEach(tx => {
      const amount = parseFloat(tx.amount);
      console.log(`   - ID ${tx.id}: ${amount} ${tx.currency} (${amount > 0 ? '✅ Сумма корректна' : '❌ Сумма = 0'})`);
    });
  }

  // 2. Проверка TON депозитов
  console.log('\n2️⃣ Проверка TON депозитов (transaction creation fix)...');
  const { data: tonDeposits, error: tonError } = await supabase
    .from('transactions')
    .select('*')
    .in('type', ['TON_DEPOSIT', 'FARMING_DEPOSIT'])
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(5);

  if (tonError) {
    console.error('❌ Ошибка запроса TON депозитов:', tonError);
  } else {
    console.log(`✅ Найдено ${tonDeposits?.length} TON депозитов`);
    tonDeposits?.forEach(tx => {
      console.log(`   - ID ${tx.id}: ${tx.type} - ${tx.amount} TON`);
    });
  }

  // 3. Проверка farming_balance в ton_farming_data
  console.log('\n3️⃣ Проверка farming_balance в ton_farming_data...');
  const { data: tonFarmingData, error: farmingError } = await supabase
    .from('ton_farming_data')
    .select('user_id, farming_balance, boost_active, boost_package_id')
    .eq('boost_active', true)
    .limit(10);

  if (farmingError) {
    console.error('❌ Ошибка запроса ton_farming_data:', farmingError);
  } else {
    console.log(`✅ Найдено ${tonFarmingData?.length} активных TON Boost пользователей`);
    tonFarmingData?.forEach(user => {
      const balance = parseFloat(user.farming_balance || '0');
      console.log(`   - User ${user.user_id}: farming_balance = ${balance} (${balance > 0 ? '✅ Баланс установлен' : '❌ Баланс = 0'})`);
    });
  }

  // 4. Проверка последних farming транзакций
  console.log('\n4️⃣ Проверка последних farming транзакций...');
  const { data: farmingRewards, error: rewardsError } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(10);

  if (rewardsError) {
    console.error('❌ Ошибка запроса farming rewards:', rewardsError);
  } else {
    const lastRewardTime = farmingRewards?.[0]?.created_at;
    const timeSinceLastReward = lastRewardTime 
      ? Math.floor((Date.now() - new Date(lastRewardTime).getTime()) / 1000 / 60)
      : null;
    
    console.log(`✅ Найдено ${farmingRewards?.length} последних farming rewards`);
    if (timeSinceLastReward !== null) {
      console.log(`   Последняя транзакция: ${timeSinceLastReward} минут назад ${timeSinceLastReward > 10 ? '⚠️' : '✅'}`);
    }
    
    // Подсчет по типам
    const uniRewards = farmingRewards?.filter(r => r.currency === 'UNI').length || 0;
    const tonRewards = farmingRewards?.filter(r => r.currency === 'TON').length || 0;
    console.log(`   - UNI rewards: ${uniRewards}`);
    console.log(`   - TON rewards: ${tonRewards}`);
  }

  // 5. Проверка TransactionHistory UI
  console.log('\n5️⃣ Проверка metadata для TransactionHistory UI...');
  const { data: recentTx, error: txError } = await supabase
    .from('transactions')
    .select('id, type, metadata, description')
    .order('created_at', { ascending: false })
    .limit(5);

  if (txError) {
    console.error('❌ Ошибка запроса транзакций:', txError);
  } else {
    console.log('✅ Последние транзакции с metadata:');
    recentTx?.forEach(tx => {
      const hasMetadata = tx.metadata && Object.keys(tx.metadata).length > 0;
      console.log(`   - ${tx.type}: ${hasMetadata ? '✅ metadata присутствует' : '❌ metadata отсутствует'}`);
      if (hasMetadata && tx.metadata.original_type) {
        console.log(`     original_type: ${tx.metadata.original_type}`);
      }
    });
  }

  console.log('\n✨ Проверка Phase 1 завершена!');
}

checkPhase1Fixes().catch(console.error);