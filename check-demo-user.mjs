import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const { data, error } = await supabase
  .from('users')
  .select('id, balance_uni, balance_ton')
  .eq('id', 48)
  .single();

console.log('Баланс пользователя 48:', data);

// Проверим последние транзакции
const { data: txs } = await supabase
  .from('transactions')
  .select('id, type, amount_uni, amount_ton, status, created_at')
  .eq('user_id', 48)
  .order('created_at', { ascending: false })
  .limit(3);

console.log('\nПоследние транзакции:');
txs?.forEach(tx => {
  console.log(`- ${tx.type}: UNI=${tx.amount_uni || 0}, TON=${tx.amount_ton || 0} (${tx.status})`);
});