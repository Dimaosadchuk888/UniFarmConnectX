#!/usr/bin/env node

/**
 * Проверка схемы БД для регрессионного тестирования
 */

const dotenv = require('dotenv');
const path = require('path');

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');

// Инициализация Supabase клиента
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkSchema() {
  console.log('=== ПРОВЕРКА СХЕМЫ БД ===\n');
  
  // Проверяем поля таблицы users
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.log('❌ Ошибка доступа к таблице users:', error.message);
    } else if (user) {
      console.log('✅ Таблица users доступна');
      console.log('📋 Поля:', Object.keys(user).join(', '));
    }
  } catch (e) {
    console.log('❌ Критическая ошибка при проверке users:', e.message);
  }
  
  // Проверяем типы транзакций
  try {
    const { data: types, error } = await supabase
      .from('transactions')
      .select('type')
      .limit(20);
    
    if (error) {
      console.log('\n❌ Ошибка доступа к таблице transactions:', error.message);
    } else if (types) {
      const uniqueTypes = [...new Set(types.map(t => t.type))];
      console.log('\n✅ Таблица transactions доступна');
      console.log('📋 Найденные типы транзакций:', uniqueTypes.join(', '));
    }
  } catch (e) {
    console.log('\n❌ Критическая ошибка при проверке transactions:', e.message);
  }
  
  // Проверяем другие таблицы
  const tables = ['referrals', 'daily_bonus_logs', 'withdraw_requests', 'farming_sessions', 'boost_purchases'];
  
  console.log('\n🔍 Проверка других таблиц:');
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && error.code === 'PGRST116') {
        console.log(`  ❌ ${table}: таблица не существует`);
      } else if (error) {
        console.log(`  ⚠️  ${table}: ${error.message}`);
      } else {
        console.log(`  ✅ ${table}: доступна (${data?.length || 0} записей)`);
      }
    } catch (e) {
      console.log(`  ❌ ${table}: критическая ошибка`);
    }
  }
}

checkSchema().catch(console.error);