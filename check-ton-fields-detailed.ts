import { supabase } from './core/supabase';

async function checkTonFieldsDetailed() {
  console.log('=== ДЕТАЛЬНАЯ ПРОВЕРКА TON ПОЛЕЙ И ТАБЛИЦ ===\n');
  console.log('Дата проверки:', new Date().toISOString());
  console.log('Только факты из базы данных, без предположений.\n');
  
  // 1. Проверка существования таблицы ton_farming_data
  console.log('1. ПРОВЕРКА ТАБЛИЦЫ ton_farming_data:');
  try {
    const { data: tonFarmingCheck, error: tonError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .limit(1);
      
    if (tonError?.code === '42P01') {
      console.log('   ❌ Таблица ton_farming_data НЕ СУЩЕСТВУЕТ');
      console.log('   Код ошибки:', tonError.code);
    } else if (tonError) {
      console.log('   ⚠️ Ошибка при проверке:', tonError.message);
    } else {
      console.log('   ✅ Таблица ton_farming_data СУЩЕСТВУЕТ');
      
      // Получаем количество записей
      const { count } = await supabase
        .from('ton_farming_data')
        .select('*', { count: 'exact', head: true });
      console.log('   Количество записей:', count);
      
      // Проверяем запись для пользователя 74
      const { data: user74Data } = await supabase
        .from('ton_farming_data')
        .select('*')
        .eq('user_id', 74)
        .single();
        
      if (user74Data) {
        console.log('   Данные пользователя 74:');
        Object.entries(user74Data).forEach(([key, value]) => {
          console.log(`     - ${key}: ${value}`);
        });
      } else {
        console.log('   Нет данных для пользователя 74');
      }
    }
  } catch (e) {
    console.log('   ❌ Исключение при проверке:', e);
  }
  
  // 2. Получаем ВСЕ поля из таблицы users
  console.log('\n2. ВСЕ ПОЛЯ В ТАБЛИЦЕ users:');
  try {
    // Получаем одну запись для анализа структуры
    const { data: sampleUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', 74)
      .single();
      
    if (sampleUser) {
      const allFields = Object.keys(sampleUser).sort();
      console.log(`   Всего полей: ${allFields.length}`);
      console.log('\n   TON-related поля:');
      
      allFields.forEach(field => {
        if (field.toLowerCase().includes('ton')) {
          const value = sampleUser[field];
          const type = value === null ? 'null' : typeof value;
          console.log(`   - ${field}: ${value} (${type})`);
        }
      });
      
      console.log('\n   Boost-related поля:');
      allFields.forEach(field => {
        if (field.toLowerCase().includes('boost')) {
          const value = sampleUser[field];
          const type = value === null ? 'null' : typeof value;
          console.log(`   - ${field}: ${value} (${type})`);
        }
      });
      
      console.log('\n   Farming-related поля (не TON):');
      allFields.forEach(field => {
        if (field.toLowerCase().includes('farming') && !field.toLowerCase().includes('ton')) {
          const value = sampleUser[field];
          const type = value === null ? 'null' : typeof value;
          console.log(`   - ${field}: ${value} (${type})`);
        }
      });
      
      console.log('\n   Полный список всех полей:');
      console.log('   ' + allFields.join(', '));
    }
  } catch (e) {
    console.log('   ❌ Ошибка при получении полей:', e);
  }
  
  // 3. Проверка других farming таблиц
  console.log('\n3. ПРОВЕРКА ДРУГИХ FARMING ТАБЛИЦ:');
  const tablesToCheck = ['uni_farming_data', 'farming_sessions', 'boost_purchases'];
  
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (error?.code === '42P01') {
        console.log(`   ❌ Таблица ${table} НЕ СУЩЕСТВУЕТ`);
      } else if (error) {
        console.log(`   ⚠️ Таблица ${table} - ошибка: ${error.message}`);
      } else {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        console.log(`   ✅ Таблица ${table} СУЩЕСТВУЕТ (${count} записей)`);
      }
    } catch (e) {
      console.log(`   ❌ Исключение при проверке ${table}:`, e);
    }
  }
  
  // 4. История изменений через transactions
  console.log('\n4. ПОСЛЕДНИЕ TON-RELATED ТРАНЗАКЦИИ:');
  const { data: tonTransactions } = await supabase
    .from('transactions')
    .select('*')
    .or('type.ilike.%TON%,description.ilike.%ton%')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (tonTransactions?.length) {
    tonTransactions.forEach((tx, idx) => {
      console.log(`   ${idx + 1}. ${tx.created_at}: ${tx.type} - ${tx.description} (TON: ${tx.amount_ton})`);
    });
  } else {
    console.log('   Нет TON-related транзакций');
  }
}

checkTonFieldsDetailed().catch(console.error);