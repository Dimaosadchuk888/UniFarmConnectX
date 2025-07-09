/**
 * Скрипт аудита схемы базы данных Supabase
 * Проверяет существующие таблицы и их структуру
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: Не найдены переменные окружения SUPABASE_URL или SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableSchema(tableName) {
  try {
    // Пробуем получить одну запись чтобы увидеть структуру
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      return { exists: false, error: error.message };
    }

    // Получаем количество записей
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    return {
      exists: true,
      count: count || 0,
      fields: data && data.length > 0 ? Object.keys(data[0]) : []
    };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function main() {
  console.log('🔍 АУДИТ СХЕМЫ БАЗЫ ДАННЫХ SUPABASE\n');
  console.log('URL:', supabaseUrl);
  console.log('KEY:', supabaseKey ? 'Установлен' : 'Отсутствует');
  console.log('\n' + '='.repeat(60) + '\n');

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

  let existingTables = 0;
  let emptyTables = 0;
  let missingTables = 0;

  for (const table of tables) {
    const result = await checkTableSchema(table);
    
    if (result.exists) {
      existingTables++;
      if (result.count === 0) {
        emptyTables++;
        console.log(`⚠️  ${table}: Существует но ПУСТАЯ (0 записей)`);
      } else {
        console.log(`✅ ${table}: ${result.count} записей`);
      }
      
      if (result.fields.length > 0) {
        console.log(`   Поля: ${result.fields.join(', ')}`);
      }
    } else {
      missingTables++;
      console.log(`❌ ${table}: НЕ СУЩЕСТВУЕТ`);
      console.log(`   Ошибка: ${result.error}`);
    }
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('\n📊 ИТОГИ:');
  console.log(`- Существующие таблицы: ${existingTables}/${tables.length}`);
  console.log(`- Пустые таблицы: ${emptyTables}`);
  console.log(`- Отсутствующие таблицы: ${missingTables}`);
  console.log(`- Готовность БД: ${Math.round((existingTables / tables.length) * 100)}%`);

  if (missingTables > 0) {
    console.log('\n⚠️  ДЕЙСТВИЯ:');
    console.log('1. Выполните SQL скрипт scripts/supabase-create-tables.sql в Supabase Dashboard');
    console.log('2. После создания таблиц запустите scripts/supabase-fill-data.js');
  }
}

main();