import { supabase } from './core/supabaseClient';

async function checkLatestTransactions() {
  console.log('=== Проверка последних транзакций после исправлений ===\n');
  
  // Проверяем самые свежие транзакции FARMING_REWARD для user_id = 74
  const { data: latestTx74, error: error74 } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .eq('type', 'FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('Последние FARMING_REWARD транзакции для user_id=74:');
  if (latestTx74 && latestTx74.length > 0) {
    latestTx74.forEach(tx => {
      console.log(`ID: ${tx.id}, Amount: ${tx.amount}, UNI: ${tx.amount_uni}, TON: ${tx.amount_ton}, Currency: ${tx.currency}, Created: ${tx.created_at}`);
    });
  } else {
    console.log('Нет транзакций');
  }
  
  console.log('\n');
  
  // Проверяем пользователей с telegram_id = 74
  const { data: usersWithTgId74, error: userError } = await supabase
    .from('users')
    .select('id, telegram_id, username')
    .eq('telegram_id', 74);
    
  console.log('Пользователи с telegram_id=74:');
  if (usersWithTgId74 && usersWithTgId74.length > 0) {
    usersWithTgId74.forEach(user => {
      console.log(`ID: ${user.id}, Telegram ID: ${user.telegram_id}, Username: ${user.username}`);
    });
  }
  
  console.log('\n');
  
  // Проверяем пользователя с id = 74
  const { data: user74, error: user74Error } = await supabase
    .from('users')
    .select('id, telegram_id, username')
    .eq('id', 74)
    .single();
    
  console.log('Пользователь с id=74:');
  if (user74) {
    console.log(`ID: ${user74.id}, Telegram ID: ${user74.telegram_id}, Username: ${user74.username}`);
  }
  
  console.log('\n');
  
  // Проверяем транзакции с ненулевым amount созданные за последний час
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  
  const { data: recentNonZeroTx, error: recentError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .neq('amount', 0)
    .gte('created_at', oneHourAgo.toISOString())
    .order('created_at', { ascending: false });
    
  console.log('Транзакции с amount != 0 за последний час для user_id=74:');
  if (recentNonZeroTx && recentNonZeroTx.length > 0) {
    console.log(`Найдено ${recentNonZeroTx.length} транзакций:`);
    recentNonZeroTx.forEach(tx => {
      console.log(`ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount}, Currency: ${tx.currency}, Created: ${tx.created_at}`);
    });
  } else {
    console.log('Нет транзакций с ненулевым amount за последний час');
  }
  
  process.exit(0);
}

checkLatestTransactions().catch(console.error);