import { supabase } from './core/supabase.js';

async function checkDemoUser() {
  // Check user with telegram_id 777777777
  const { data: userByTelegramId, error: err1 } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, balance_ton')
    .eq('telegram_id', 777777777)
    .single();
    
  console.log('User with telegram_id 777777777:', userByTelegramId);
  
  // Check user with id 48
  const { data: userById, error: err2 } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, balance_ton')
    .eq('id', 48)
    .single();
    
  console.log('User with id 48:', userById);
  
  // Check transactions for user 48
  const { data: transactions, error: err3 } = await supabase
    .from('transactions')
    .select('id, user_id, type, amount_uni, amount_ton, created_at')
    .eq('user_id', 48)
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log(`Transactions for user 48 (found ${transactions?.length || 0}):`, transactions);
}

checkDemoUser();
