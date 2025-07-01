import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const { error } = await supabase
  .from('users')
  .update({ balance_ton: '1000' })
  .eq('id', 48);

if (error) {
  console.error('Ошибка восстановления баланса TON:', error);
} else {
  console.log('TON баланс восстановлен до 1000!');
  
  // Проверяем итоговый баланс
  const { data } = await supabase
    .from('users')
    .select('balance_uni, balance_ton')
    .eq('id', 48)
    .single();
    
  console.log('Итоговый баланс:');
  console.log(`UNI: ${data.balance_uni}`);
  console.log(`TON: ${data.balance_ton}`);
}