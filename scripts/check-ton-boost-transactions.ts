/**
 * Детальная проверка транзакций TON Boost
 */

import { supabase } from '../core/supabaseClient';

async function checkTonBoostTransactions() {
  console.log('=== Проверка транзакций TON Boost ===\n');
  
  // 1. Проверяем транзакции FARMING_REWARD с описанием TON Boost
  console.log('🔍 Поиск транзакций TON Boost через описание:');
  console.log('--------------------------------------------');
  
  const { data: tonBoostTx, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'FARMING_REWARD')
    .or('description.ilike.%TON Boost%,description.ilike.%ton boost%')
    .order('created_at', { ascending: false })
    .limit(20);
    
  if (error) {
    console.error('❌ Ошибка запроса:', error);
    return;
  }
  
  if (tonBoostTx && tonBoostTx.length > 0) {
    console.log(`✅ Найдено ${tonBoostTx.length} транзакций TON Boost (тип FARMING_REWARD):\n`);
    
    tonBoostTx.forEach(tx => {
      console.log(`ID: ${tx.id}`);
      console.log(`User: ${tx.user_id}`);
      console.log(`Type: ${tx.type}`);
      console.log(`Amount TON: ${tx.amount_ton}`);
      console.log(`Description: "${tx.description}"`);
      console.log(`Created: ${tx.created_at}`);
      console.log('---');
    });
  } else {
    console.log('❌ Транзакции TON Boost не найдены');
  }
  
  console.log('\n');
  
  // 2. Проверяем metadata для поиска original_type
  console.log('🔍 Поиск транзакций с original_type = TON_BOOST_INCOME:');
  console.log('------------------------------------------------------');
  
  const { data: metadataTx } = await supabase
    .from('transactions')
    .select('*')
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100);
    
  let tonBoostCount = 0;
  if (metadataTx) {
    metadataTx.forEach(tx => {
      if (tx.metadata && tx.metadata.original_type === 'TON_BOOST_INCOME') {
        tonBoostCount++;
        if (tonBoostCount <= 5) {
          console.log(`✅ Найдена TON_BOOST_INCOME транзакция:`);
          console.log(`   ID: ${tx.id}, User: ${tx.user_id}`);
          console.log(`   Amount: ${tx.amount_ton} TON`);
          console.log(`   Metadata:`, tx.metadata);
          console.log('---');
        }
      }
    });
  }
  
  if (tonBoostCount > 0) {
    console.log(`\n✅ Всего найдено ${tonBoostCount} транзакций с original_type = TON_BOOST_INCOME`);
  } else {
    console.log('❌ Транзакции с original_type = TON_BOOST_INCOME не найдены');
  }
  
  console.log('\n');
  
  // 3. Проверяем пользователей с активными TON Boost пакетами
  console.log('👥 Пользователи с активными TON Boost пакетами:');
  console.log('----------------------------------------------');
  
  const { data: boostUsers } = await supabase
    .from('users')
    .select('id, username, ton_boost_package, ton_boost_rate, balance_ton')
    .not('ton_boost_package', 'is', null)
    .not('ton_boost_package', 'eq', 0)
    .limit(10);
    
  if (boostUsers && boostUsers.length > 0) {
    console.log(`✅ Найдено ${boostUsers.length} пользователей с TON Boost:\n`);
    boostUsers.forEach(user => {
      console.log(`User ${user.id} (${user.username || 'no username'}):`);
      console.log(`  Package: ${user.ton_boost_package}`);
      console.log(`  Rate: ${user.ton_boost_rate || 'не указан'}`);
      console.log(`  Balance TON: ${user.balance_ton}`);
    });
  } else {
    console.log('❌ Пользователи с активными TON Boost пакетами не найдены');
  }
  
  console.log('\n=== Конец проверки ===');
}

// Запуск
checkTonBoostTransactions().catch(console.error);