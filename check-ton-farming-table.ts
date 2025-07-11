import { supabase } from './core/supabase';

async function checkTonFarmingTable() {
  console.log('=== ПРОВЕРКА ТАБЛИЦЫ ton_farming_data ===\n');
  
  // Проверяем существование таблицы
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'ton_farming_data');
    
  if (!tables || tables.length === 0) {
    console.log('❌ Таблица ton_farming_data НЕ СУЩЕСТВУЕТ!');
    console.log('Система использует fallback на таблицу users');
    
    // Проверяем поля TON в таблице users
    const { data: userData } = await supabase
      .from('users')
      .select('ton_boost_package, ton_boost_active, ton_farming_deposit, ton_farming_balance, ton_farming_rate')
      .eq('id', 74)
      .single();
      
    console.log('\n📊 TON данные в таблице users:');
    console.log('- ton_boost_package:', userData?.ton_boost_package);
    console.log('- ton_boost_active:', userData?.ton_boost_active);
    console.log('- ton_farming_deposit:', userData?.ton_farming_deposit);
    console.log('- ton_farming_balance:', userData?.ton_farming_balance);
    console.log('- ton_farming_rate:', userData?.ton_farming_rate);
  } else {
    console.log('✅ Таблица ton_farming_data существует');
    
    // Проверяем данные пользователя 74
    const { data, error } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', 74)
      .single();
      
    if (error && error.code === 'PGRST116') {
      console.log('Нет записи для пользователя 74 в ton_farming_data');
    } else if (data) {
      console.log('\n📊 Данные в ton_farming_data:');
      console.log('- package_id:', data.boost_package_id);
      console.log('- is_active:', data.boost_active);
      console.log('- farming_balance:', data.farming_balance);
      console.log('- farming_rate:', data.farming_rate);
    }
  }
  
  // Проверяем структуру таблицы users на наличие TON полей
  const { data: columns } = await supabase
    .rpc('get_column_names', { table_name: 'users' })
    .select('column_name')
    .ilike('column_name', 'ton_%');
    
  console.log('\n📋 TON-related поля в таблице users:', columns?.map(c => c.column_name).join(', ') || 'Нет данных');
}

checkTonFarmingTable().catch(console.error);