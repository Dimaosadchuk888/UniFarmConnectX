import { supabase } from './core/supabase';

async function debugDeposit() {
  console.log('Debugging farming deposit for user 74...\n');

  // Получаем пользователя
  const { data: user, error } = await supabase
    .from('users')
    .select('id, balance_uni, balance_ton, uni_deposit_amount, uni_farming_active')
    .eq('id', 74)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('User 74 data from DB:');
  console.log('- id:', user.id);
  console.log('- balance_uni:', user.balance_uni, 'type:', typeof user.balance_uni);
  console.log('- balance_ton:', user.balance_ton, 'type:', typeof user.balance_ton);
  console.log('- uni_deposit_amount:', user.uni_deposit_amount, 'type:', typeof user.uni_deposit_amount);
  
  // Тестируем сравнение
  const testAmount = 50;
  console.log('\nТест сравнения:');
  console.log('- testAmount:', testAmount);
  console.log('- balance_uni >= testAmount:', user.balance_uni >= testAmount);
  console.log('- Прямое сравнение чисел:', 821000 >= 50);
  
  // Проверяем, как хранятся данные в БД
  const { data: rawQuery, error: rawError } = await supabase
    .rpc('execute_sql', { 
      query: "SELECT id, balance_uni::text as balance_text, pg_typeof(balance_uni) as balance_type FROM users WHERE id = 74" 
    });
    
  if (!rawError && rawQuery) {
    console.log('\nRaw SQL query result:', rawQuery);
  }
}

debugDeposit().catch(console.error);