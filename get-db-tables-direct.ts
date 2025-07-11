import { supabase } from './core/supabaseClient';

async function getDatabaseTablesDirect() {
  console.log('=== ПРЯМАЯ ПРОВЕРКА ТАБЛИЦ UNIFARM ===\n');
  
  // Список таблиц согласно документации
  const tables = [
    'users',
    'user_sessions',
    'transactions', 
    'referrals',
    'farming_sessions',
    'boost_purchases',
    'missions',
    'user_missions',
    'airdrops',
    'daily_bonus_logs',
    'withdraw_requests'
  ];
  
  const schemaInfo = [];
  
  for (const tableName of tables) {
    console.log(`\nПроверка таблицы: ${tableName}`);
    console.log('=' . repeat(50));
    
    try {
      // Пробуем получить одну запись для анализа структуры
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
        
      if (error) {
        console.log(`❌ Ошибка доступа: ${error.message}`);
        if (error.message.includes('does not exist')) {
          console.log(`   Таблица НЕ СУЩЕСТВУЕТ в базе данных`);
        }
        continue;
      }
      
      // Получаем количество записей
      const { count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
        
      console.log(`✅ Таблица существует, записей: ${count || 0}`);
      
      // Анализируем структуру по первой записи
      if (data && data.length > 0) {
        const sample = data[0];
        console.log(`\nПоля таблицы ${tableName}:`);
        
        for (const [field, value] of Object.entries(sample)) {
          const type = value === null ? 'NULL' : typeof value;
          console.log(`  - ${field}: ${type} (пример: ${value === null ? 'NULL' : JSON.stringify(value).slice(0, 50)})`);
          
          schemaInfo.push({
            table: tableName,
            field,
            sampleType: type,
            sampleValue: value
          });
        }
      } else {
        console.log(`  Таблица пустая, структура неизвестна`);
      }
      
    } catch (err) {
      console.log(`❌ Неизвестная ошибка: ${err.message}`);
    }
  }
  
  // Сохраняем информацию
  const fs = await import('fs');
  fs.writeFileSync('schema_direct_check.json', JSON.stringify(schemaInfo, null, 2));
  
  console.log('\n\nДанные сохранены в schema_direct_check.json');
  
  // Дополнительная проверка типов транзакций
  console.log('\n\n=== АНАЛИЗ ТИПОВ ТРАНЗАКЦИЙ ===');
  
  const { data: txTypes } = await supabase
    .from('transactions')
    .select('type')
    .limit(1000);
    
  const typeCounts = {};
  txTypes?.forEach(tx => {
    typeCounts[tx.type] = (typeCounts[tx.type] || 0) + 1;
  });
  
  console.log('\nТипы транзакций в базе:');
  for (const [type, count] of Object.entries(typeCounts)) {
    console.log(`  - ${type}: ${count} записей`);
  }
  
  process.exit(0);
}

getDatabaseTablesDirect().catch(console.error);