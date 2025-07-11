import { supabase } from './core/supabaseClient';

async function checkAllTransactionTypes() {
  console.log('=== ГЛУБОКАЯ ПРОВЕРКА ТРАНЗАКЦИЙ В БАЗЕ ДАННЫХ ===\n');
  
  // 1. Проверка общей статистики транзакций
  const { data: allTx, count } = await supabase
    .from('transactions')
    .select('type', { count: 'exact', head: true });
    
  console.log(`Общее количество транзакций в базе: ${count}\n`);
  
  // 2. Группировка транзакций по типам
  const { data: txByType } = await supabase
    .from('transactions')
    .select('type')
    .order('type');
    
  const typeCounts = new Map();
  txByType?.forEach(tx => {
    typeCounts.set(tx.type, (typeCounts.get(tx.type) || 0) + 1);
  });
  
  console.log('Распределение транзакций по типам:');
  console.log('================================');
  for (const [type, count] of typeCounts) {
    console.log(`${type}: ${count} транзакций`);
  }
  console.log('\n');
  
  // 3. Проверка FARMING_REWARD транзакций
  console.log('FARMING_REWARD транзакции:');
  console.log('-------------------------');
  const { data: farmingRewards } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log(`Найдено FARMING_REWARD: ${farmingRewards?.length || 0} (последние 10)`);
  if (farmingRewards && farmingRewards.length > 0) {
    console.log('Последние начисления:');
    farmingRewards.forEach(tx => {
      console.log(`- User ${tx.user_id}: ${tx.amount_uni} UNI at ${tx.created_at}`);
    });
  }
  console.log('\n');
  
  // 4. Проверка TON_BOOST_REWARD транзакций
  console.log('TON_BOOST_REWARD транзакции:');
  console.log('----------------------------');
  const { data: tonBoostRewards } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'TON_BOOST_REWARD')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log(`Найдено TON_BOOST_REWARD: ${tonBoostRewards?.length || 0} (последние 10)`);
  if (tonBoostRewards && tonBoostRewards.length > 0) {
    console.log('Последние начисления:');
    tonBoostRewards.forEach(tx => {
      console.log(`- User ${tx.user_id}: ${tx.amount_ton} TON at ${tx.created_at}`);
    });
  }
  console.log('\n');
  
  // 5. Проверка MISSION_REWARD транзакций  
  console.log('MISSION_REWARD транзакции:');
  console.log('--------------------------');
  const { data: missionRewards } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'MISSION_REWARD')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log(`Найдено MISSION_REWARD: ${missionRewards?.length || 0} (последние 10)`);
  if (missionRewards && missionRewards.length > 0) {
    console.log('Последние начисления:');
    missionRewards.forEach(tx => {
      console.log(`- User ${tx.user_id}: ${tx.amount_uni} UNI - ${tx.description}`);
    });
  }
  console.log('\n');
  
  // 6. Проверка последних транзакций для user 74
  console.log('Транзакции пользователя 74:');
  console.log('---------------------------');
  const { data: user74Tx } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .order('created_at', { ascending: false })
    .limit(20);
    
  const user74Types = new Map();
  user74Tx?.forEach(tx => {
    user74Types.set(tx.type, (user74Types.get(tx.type) || 0) + 1);
  });
  
  console.log('Типы транзакций у user 74 (последние 20):');
  for (const [type, count] of user74Types) {
    console.log(`- ${type}: ${count}`);
  }
  console.log('\n');
  
  // 7. Проверка пользователей с активным TON Boost
  console.log('Пользователи с активным TON Boost:');
  console.log('----------------------------------');
  const { data: tonBoostUsers } = await supabase
    .from('users')
    .select('id, username, ton_boost_package, ton_boost_start_timestamp')
    .not('ton_boost_package', 'is', null)
    .not('ton_boost_package', 'eq', '');
    
  console.log(`Найдено пользователей с TON Boost: ${tonBoostUsers?.length || 0}`);
  if (tonBoostUsers && tonBoostUsers.length > 0) {
    console.log('Активные boost пакеты:');
    tonBoostUsers.forEach(user => {
      console.log(`- User ${user.id} (${user.username}): ${user.ton_boost_package} с ${user.ton_boost_start_timestamp}`);
    });
  }
  console.log('\n');
  
  // 8. Проверка последних изменений балансов
  console.log('Последние транзакции всех типов (10 штук):');
  console.log('------------------------------------------');
  const { data: recentTx } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  recentTx?.forEach(tx => {
    const amount = tx.amount_uni > 0 ? `${tx.amount_uni} UNI` : `${tx.amount_ton} TON`;
    console.log(`[${tx.created_at}] User ${tx.user_id}: ${tx.type} - ${amount}`);
  });
  
  process.exit(0);
}

checkAllTransactionTypes().catch(console.error);