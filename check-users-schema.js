/**
 * Проверка структуры таблицы users
 */

import { createClient } from '@supabase/supabase-js';

async function checkUsersSchema() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('📊 АНАЛИЗ СТРУКТУРЫ ТАБЛИЦЫ USERS');
  console.log('='.repeat(50));
  
  // Получаем существующего пользователя для изучения структуры
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', 48)
    .single();
  
  if (!error) {
    console.log('✅ Структура таблицы users:');
    Object.keys(data).forEach(field => {
      const value = data[field];
      const type = typeof value;
      const displayValue = value === null ? 'NULL' : (type === 'string' && value.length > 30 ? value.substring(0, 30) + '...' : value);
      console.log(`   ${field.padEnd(25)}: ${type.padEnd(8)} = ${displayValue}`);
    });
    
    console.log('\n📋 Обязательные поля для создания пользователя:');
    const requiredFields = ['telegram_id', 'username', 'ref_code', 'first_name'];
    const optionalFields = ['referred_by', 'balance_uni', 'balance_ton', 'uni_deposit_amount', 'uni_farming_start_timestamp', 'uni_farming_rate', 'ton_boost_package', 'ton_boost_rate', 'ton_boost_start_timestamp'];
    
    requiredFields.forEach(field => {
      const exists = Object.keys(data).includes(field);
      console.log(`   ${exists ? '✅' : '❌'} ${field}`);
    });
    
    console.log('\n📋 Опциональные поля:');
    optionalFields.forEach(field => {
      const exists = Object.keys(data).includes(field);
      console.log(`   ${exists ? '✅' : '❌'} ${field}`);
    });
    
  } else {
    console.log('❌ Ошибка получения данных:', error.message);
  }
}

checkUsersSchema().catch(console.error);