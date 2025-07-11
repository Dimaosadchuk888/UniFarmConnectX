import { supabase } from './core/supabase';
import { uniFarmingRepository } from './modules/farming/UniFarmingRepository';

async function testDepositDebug() {
  console.log('=== TEST DEPOSIT DEBUG ===');
  
  // Проверяем существование таблицы uni_farming_data
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', ['uni_farming_data', 'users']);
  
  console.log('Существующие таблицы:', tables?.map(t => t.table_name));
  
  // Пробуем напрямую обновить депозит
  console.log('\nТестируем addDeposit для user_id: 74');
  const result = await uniFarmingRepository.addDeposit('74', '10');
  console.log('Результат addDeposit:', result);
  
  // Проверяем данные пользователя
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, balance_uni, uni_deposit_amount, uni_farming_active')
    .eq('id', 74)
    .single();
    
  console.log('\nДанные пользователя после:', user);
}

testDepositDebug().catch(console.error);