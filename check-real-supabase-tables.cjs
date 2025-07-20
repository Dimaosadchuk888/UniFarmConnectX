/**
 * ПРОВЕРКА РЕАЛЬНОЙ СТРУКТУРЫ SUPABASE БД
 * Определение правильных названий таблиц
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Отсутствуют переменные Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  console.log('🔍 ПРОВЕРКА СТРУКТУРЫ SUPABASE БД');
  console.log('='.repeat(50));
  
  // Попробуем разные варианты названий таблиц
  const tableNames = [
    'transactions',
    'user_transactions', 
    'transaction',
    'user_transaction'
  ];
  
  for (const tableName of tableNames) {
    try {
      console.log(`\n📋 Проверяем таблицу: ${tableName}`);
      
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ❌ ${tableName}: ${error.message}`);
      } else {
        console.log(`   ✅ ${tableName}: существует, записей: ${count}`);
        
        // Получаем пример записи для анализа структуры
        const { data: sample } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
          
        if (sample && sample.length > 0) {
          console.log(`   📊 Структура таблицы ${tableName}:`);
          Object.keys(sample[0]).forEach(column => {
            console.log(`       - ${column}: ${typeof sample[0][column]}`);
          });
        }
      }
    } catch (err) {
      console.log(`   ❌ ${tableName}: критическая ошибка`);
    }
  }
}

async function checkTonDepositTransaction() {
  console.log('\n\n🔍 ПОИСК ТЕСТОВОЙ TON ТРАНЗАКЦИИ');
  console.log('='.repeat(50));
  
  const hash = '00a1ba3c2614f4d65cc346805feea960';
  
  const tableNames = ['transactions', 'user_transactions'];
  
  for (const tableName of tableNames) {
    try {
      console.log(`\n📋 Ищем в таблице: ${tableName}`);
      
      const { data: transactions, error } = await supabase
        .from(tableName)
        .select('*')
        .or(`description.ilike.%${hash}%,metadata->>tx_hash.eq.${hash}`);
      
      if (error) {
        console.log(`   ❌ Ошибка поиска в ${tableName}: ${error.message}`);
      } else {
        console.log(`   📊 Найдено транзакций в ${tableName}: ${transactions?.length || 0}`);
        
        if (transactions && transactions.length > 0) {
          transactions.forEach((tx, i) => {
            console.log(`   📄 Транзакция ${i + 1}:`);
            console.log(`       ID: ${tx.id}, User: ${tx.user_id}`);
            console.log(`       Тип: ${tx.type}, Сумма: ${tx.amount}`);
            console.log(`       Описание: ${tx.description}`);
          });
        }
      }
    } catch (err) {
      console.log(`   ❌ Критическая ошибка поиска в ${tableName}`);
    }
  }
}

// Запуск проверки
checkTableStructure()
  .then(() => checkTonDepositTransaction())
  .catch(console.error);