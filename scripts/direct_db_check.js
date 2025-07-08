/**
 * Прямая проверка базы данных через Supabase API
 * Без JWT авторизации - только проверка структуры таблиц
 */

import { createClient } from '@supabase/supabase-js';

// Конфигурация Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_KEY не найден в переменных окружения');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName) {
  try {
    // Проверяем существование таблицы
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      return {
        table: tableName,
        exists: false,
        error: error.message,
        status: 'missing'
      };
    }

    // Получаем структуру таблицы
    let fields = [];
    if (count > 0) {
      const { data: sampleData } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (sampleData && sampleData[0]) {
        fields = Object.keys(sampleData[0]);
      }
    }

    return {
      table: tableName,
      exists: true,
      records: count || 0,
      fields,
      status: 'exists'
    };
  } catch (err) {
    return {
      table: tableName,
      exists: false,
      error: err.message,
      status: 'error'
    };
  }
}

async function runDatabaseCheck() {
  console.log('🗄️ ПРЯМАЯ ПРОВЕРКА БАЗЫ ДАННЫХ UNIFARM');
  console.log('=' .repeat(50));
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Время проверки: ${new Date().toISOString()}\n`);

  // Список всех ожидаемых таблиц
  const tables = [
    'users',
    'transactions', 
    'referrals',
    'farming_sessions',
    'user_sessions',
    'boost_purchases',
    'missions',
    'user_missions',
    'airdrops',
    'daily_bonus_logs',
    'withdraw_requests'
  ];

  const results = {};
  let existingTables = 0;
  let missingTables = 0;

  console.log('📋 ПРОВЕРКА ТАБЛИЦ:\n');

  for (const tableName of tables) {
    const result = await checkTable(tableName);
    results[tableName] = result;

    if (result.exists) {
      existingTables++;
      console.log(`✅ ${tableName}: ${result.records} записей, ${result.fields.length} полей`);
      if (result.fields.length > 0) {
        console.log(`   Поля: ${result.fields.slice(0, 5).join(', ')}${result.fields.length > 5 ? '...' : ''}`);
      }
    } else {
      missingTables++;
      console.log(`❌ ${tableName}: ОТСУТСТВУЕТ (${result.error})`);
    }

    // Пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n📊 СТАТИСТИКА:');
  console.log(`✅ Существующие таблицы: ${existingTables}/${tables.length}`);
  console.log(`❌ Отсутствующие таблицы: ${missingTables}/${tables.length}`);
  
  const completeness = Math.round((existingTables / tables.length) * 100);
  console.log(`📈 Готовность базы данных: ${completeness}%`);

  // Анализ критических таблиц
  const criticalTables = ['users', 'transactions', 'boost_purchases', 'missions', 'user_missions'];
  const criticalMissing = criticalTables.filter(table => !results[table]?.exists);
  
  if (criticalMissing.length > 0) {
    console.log('\n🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ:');
    criticalMissing.forEach(table => {
      console.log(`- Отсутствует критическая таблица: ${table}`);
    });
  }

  // Проверка пользователей и транзакций
  if (results.users?.exists && results.users.records > 0) {
    console.log('\n👥 ДАННЫЕ ПОЛЬЗОВАТЕЛЕЙ:');
    
    try {
      // Получаем информацию о пользователях
      const { data: userData } = await supabase
        .from('users')
        .select('id, username, balance_uni, balance_ton, created_at')
        .limit(5);
      
      if (userData && userData.length > 0) {
        console.log(`📈 Всего пользователей: ${results.users.records}`);
        console.log('🔍 Примеры пользователей:');
        userData.forEach(user => {
          console.log(`   ID: ${user.id}, Username: ${user.username || 'N/A'}, UNI: ${user.balance_uni || 0}, TON: ${user.balance_ton || 0}`);
        });
      }
    } catch (err) {
      console.log(`❌ Ошибка при получении данных пользователей: ${err.message}`);
    }
  }

  if (results.transactions?.exists && results.transactions.records > 0) {
    console.log('\n💰 ДАННЫЕ ТРАНЗАКЦИЙ:');
    
    try {
      // Получаем статистику транзакций
      const { data: txData } = await supabase
        .from('transactions')
        .select('transaction_type, currency, amount')
        .limit(10);
      
      if (txData && txData.length > 0) {
        console.log(`📈 Всего транзакций: ${results.transactions.records}`);
        console.log('🔍 Последние транзакции:');
        txData.slice(0, 3).forEach(tx => {
          console.log(`   Тип: ${tx.transaction_type}, Валюта: ${tx.currency}, Сумма: ${tx.amount}`);
        });
      }
    } catch (err) {
      console.log(`❌ Ошибка при получении транзакций: ${err.message}`);
    }
  }

  // Рекомендации
  console.log('\n🎯 РЕКОМЕНДАЦИИ:');
  
  if (completeness < 50) {
    console.log('🚨 КРИТИЧНО: База данных серьезно неполная');
    console.log('📋 Требуется немедленное выполнение SQL-скрипта восстановления');
    console.log('📄 Файл: docs/database_fix_script.sql');
  } else if (completeness < 80) {
    console.log('⚠️ ВНИМАНИЕ: База данных частично готова');
    console.log('🔧 Рекомендуется добавить недостающие таблицы');
  } else {
    console.log('✅ ХОРОШО: База данных в основном готова');
    console.log('🎉 Можно запускать систему с ограниченным функционалом');
  }

  return {
    timestamp: new Date().toISOString(),
    completeness,
    existing_tables: existingTables,
    missing_tables: missingTables,
    total_tables: tables.length,
    critical_missing: criticalMissing,
    results
  };
}

// Запуск проверки
runDatabaseCheck()
  .then(report => {
    console.log(`\n🎯 Проверка завершена! Готовность: ${report.completeness}%`);
  })
  .catch(error => {
    console.error('❌ Критическая ошибка проверки:', error.message);
    process.exit(1);
  });