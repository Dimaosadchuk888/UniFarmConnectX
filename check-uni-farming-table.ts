import { supabase } from './core/supabase';

async function checkUniFarmingTable() {
  console.log('=== ПРОВЕРКА ТАБЛИЦЫ uni_farming_data ===\n');
  
  // Проверяем данные в uni_farming_data
  const { data, error } = await supabase
    .from('uni_farming_data')
    .select('*')
    .eq('user_id', 74)
    .single();
    
  if (error) {
    console.log('Ошибка при чтении uni_farming_data:', error);
  } else {
    console.log('Данные в uni_farming_data:');
    console.log('- user_id:', data.user_id);
    console.log('- deposit_amount:', data.deposit_amount);
    console.log('- farming_deposit:', data.farming_deposit);
    console.log('- is_active:', data.is_active);
    console.log('- farming_balance:', data.farming_balance);
    console.log('- farming_rate:', data.farming_rate);
  }
  
  // Проверяем данные в users
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, balance_uni, uni_deposit_amount, uni_farming_active')
    .eq('id', 74)
    .single();
    
  console.log('\nДанные в таблице users:');
  console.log('- balance_uni:', userData?.balance_uni);
  console.log('- uni_deposit_amount:', userData?.uni_deposit_amount);
  console.log('- uni_farming_active:', userData?.uni_farming_active);
}

checkUniFarmingTable().catch(console.error);