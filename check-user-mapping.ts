import { supabase } from './core/supabaseClient';

async function checkUserMapping() {
  console.log('=== Проверка маппинга пользователей ===\n');
  
  // Проверяем пользователя с telegram_id = 999489 (из JWT)
  const { data: user74, error: error74 } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, balance_ton')
    .eq('telegram_id', 999489)
    .single();
    
  if (user74) {
    console.log('Пользователь с telegram_id=999489:');
    console.log(user74);
    console.log('');
  }
  
  // Проверяем пользователя с id = 74
  const { data: userById74, error: errorById74 } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, balance_ton')
    .eq('id', 74)
    .single();
    
  if (userById74) {
    console.log('\nПользователь с id=74:');
    console.log(userById74);
    console.log('');
  }
  
  // Проверяем пользователя с id = 75 (чьи транзакции возвращаются)
  const { data: user75, error: error75 } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, balance_ton')
    .eq('id', 75)
    .single();
    
  if (user75) {
    console.log('\nПользователь с id=75:');
    console.log(user75);
    console.log('');
  }
  
  // Проверяем транзакции для user_id = 74
  const { data: transactions74, error: txError74 } = await supabase
    .from('transactions')
    .select('id, user_id, type, amount, currency, created_at')
    .eq('user_id', 74)
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('\nТранзакции для user_id=74:');
  console.log('Количество:', transactions74?.length || 0);
  if (transactions74 && transactions74.length > 0) {
    console.log(transactions74);
  }
  
  // Проверяем транзакции для user_id = 75
  const { data: transactions75, error: txError75 } = await supabase
    .from('transactions')
    .select('id, user_id, type, amount, currency, created_at')
    .eq('user_id', 75)
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('\nТранзакции для user_id=75:');
  console.log('Количество:', transactions75?.length || 0);
  if (transactions75 && transactions75.length > 0) {
    console.log(transactions75);
  }
  
  process.exit(0);
}

checkUserMapping().catch(console.error);