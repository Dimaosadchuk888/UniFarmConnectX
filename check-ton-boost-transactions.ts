import { supabase } from './core/supabaseClient';

async function checkTonBoostTransactions() {
  console.log('=== ДЕТАЛЬНАЯ ПРОВЕРКА TON BOOST СИСТЕМЫ ===\n');
  
  // 1. Проверка пользователей с TON балансом
  const { data: tonUsers } = await supabase
    .from('users')
    .select('id, username, balance_ton, ton_boost_package, ton_boost_start_timestamp')
    .gt('balance_ton', 0)
    .order('balance_ton', { ascending: false })
    .limit(10);
    
  console.log('Пользователи с TON балансом > 0:');
  console.log('=================================');
  tonUsers?.forEach(user => {
    console.log(`User ${user.id}: ${user.balance_ton} TON, Boost: ${user.ton_boost_package || 'нет'}`);
  });
  console.log('\n');
  
  // 2. Проверка boost_purchases таблицы
  console.log('Проверка таблицы boost_purchases:');
  console.log('=================================');
  const { data: boostPurchases, error: boostError } = await supabase
    .from('boost_purchases')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (boostError) {
    console.log('Ошибка при доступе к boost_purchases:', boostError.message);
  } else {
    console.log(`Найдено записей в boost_purchases: ${boostPurchases?.length || 0}`);
    if (boostPurchases && boostPurchases.length > 0) {
      boostPurchases.forEach(bp => {
        console.log(`- User ${bp.user_id}: ${bp.package_type} на ${bp.duration} дней, статус: ${bp.status}`);
      });
    }
  }
  console.log('\n');
  
  // 3. Проверка транзакций типа TON_BOOST_INCOME
  console.log('Проверка транзакций TON_BOOST_INCOME:');
  console.log('=====================================');
  const { data: tonBoostIncome } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'TON_BOOST_INCOME')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log(`Найдено TON_BOOST_INCOME: ${tonBoostIncome?.length || 0}`);
  if (tonBoostIncome && tonBoostIncome.length > 0) {
    tonBoostIncome.forEach(tx => {
      console.log(`- User ${tx.user_id}: ${tx.amount_ton} TON at ${tx.created_at}`);
    });
  }
  console.log('\n');
  
  // 4. Проверка всех возможных типов транзакций для TON
  console.log('Все типы транзакций с TON (amount_ton > 0):');
  console.log('===========================================');
  const { data: tonTx } = await supabase
    .from('transactions')
    .select('type, user_id, amount_ton, created_at')
    .gt('amount_ton', 0)
    .order('created_at', { ascending: false })
    .limit(20);
    
  const tonTypes = new Map();
  tonTx?.forEach(tx => {
    tonTypes.set(tx.type, (tonTypes.get(tx.type) || 0) + 1);
  });
  
  console.log('Типы транзакций с TON:');
  for (const [type, count] of tonTypes) {
    console.log(`- ${type}: ${count}`);
  }
  
  if (tonTx && tonTx.length > 0) {
    console.log('\nПоследние TON транзакции:');
    tonTx.slice(0, 5).forEach(tx => {
      console.log(`[${tx.created_at}] User ${tx.user_id}: ${tx.type} - ${tx.amount_ton} TON`);
    });
  }
  console.log('\n');
  
  // 5. Проверка user 74 специально
  console.log('Детальная проверка пользователя 74:');
  console.log('===================================');
  const { data: user74 } = await supabase
    .from('users')
    .select('*')
    .eq('id', 74)
    .single();
    
  console.log('TON данные user 74:');
  console.log(`- Balance TON: ${user74?.balance_ton}`);
  console.log(`- TON Boost Package: ${user74?.ton_boost_package}`);
  console.log(`- TON Boost Start: ${user74?.ton_boost_start_timestamp}`);
  
  // TON транзакции user 74
  const { data: user74TonTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .gt('amount_ton', 0)
    .order('created_at', { ascending: false });
    
  console.log(`\nTON транзакций у user 74: ${user74TonTx?.length || 0}`);
  if (user74TonTx && user74TonTx.length > 0) {
    console.log('Последние TON транзакции:');
    user74TonTx.slice(0, 5).forEach(tx => {
      console.log(`- ${tx.type}: ${tx.amount_ton} TON at ${tx.created_at}`);
    });
  }
  
  process.exit(0);
}

checkTonBoostTransactions().catch(console.error);