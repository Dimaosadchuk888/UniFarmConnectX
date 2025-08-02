import { supabase } from './core/supabaseClient';

async function checkDatabaseFields() {
  console.log('=== ПРОВЕРКА СТРУКТУРЫ БД ===\n');
  
  // 1. Проверим наличие таблицы uni_farming_data
  console.log('1. Проверка таблицы uni_farming_data:');
  const { data: uniFarmingData, error: uniError } = await supabase
    .from('uni_farming_data')
    .select('*')
    .limit(1);
    
  if (uniError) {
    console.log('❌ Таблица uni_farming_data НЕ существует или недоступна');
    console.log('   Ошибка:', uniError.code, uniError.message);
  } else {
    console.log('✅ Таблица uni_farming_data существует');
  }
  
  // 2. Проверим структуру таблицы users
  console.log('\n2. Проверка полей в таблице users:');
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', 1)
    .limit(1)
    .single();
    
  if (userError && userError.code !== 'PGRST116') {
    console.log('❌ Ошибка при доступе к таблице users:', userError);
    return;
  }
  
  // Получим любого пользователя для проверки полей
  const { data: anyUser } = await supabase
    .from('users')
    .select('*')
    .limit(1)
    .single();
    
  if (anyUser) {
    console.log('\nДоступные поля в таблице users:');
    const fields = Object.keys(anyUser);
    
    // Проверим критически важные поля для фарминга
    const requiredFields = [
      'uni_deposit_amount',
      'uni_farming_active',
      'uni_farming_balance',
      'uni_farming_rate',
      'uni_farming_start_timestamp',
      'uni_farming_last_update'
    ];
    
    requiredFields.forEach(field => {
      if (fields.includes(field)) {
        console.log(`✅ ${field} - существует`);
      } else {
        console.log(`❌ ${field} - НЕ НАЙДЕНО!`);
      }
    });
    
    console.log('\nВсе поля в таблице users:');
    fields.forEach(field => console.log(`   - ${field}`));
    console.log(`\nВсего полей: ${fields.length}`);
  } else {
    console.log('❌ Не удалось получить данные из таблицы users');
  }
  
  // 3. Попробуем выполнить тестовый UPDATE
  console.log('\n3. Тест UPDATE запроса:');
  const testData = {
    uni_deposit_amount: '100',
    uni_farming_active: true,
    uni_farming_last_update: new Date().toISOString()
  };
  
  const { data: updateTest, error: updateError } = await supabase
    .from('users')
    .update(testData)
    .eq('id', 999999) // Несуществующий ID для безопасности
    .select();
    
  if (updateError) {
    console.log('❌ Ошибка при UPDATE:', updateError.code, updateError.message);
    if (updateError.message.includes('column')) {
      console.log('   ПРОБЛЕМА: Одно или несколько полей не существуют в таблице!');
    }
  } else {
    console.log('✅ UPDATE запрос синтаксически корректен');
  }
}

checkDatabaseFields().catch(console.error);