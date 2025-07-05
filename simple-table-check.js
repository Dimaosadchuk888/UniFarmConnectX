/**
 * Простая проверка существования таблицы withdraw_requests
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

async function simpleCheck() {
  console.log('=== Простая проверка таблицы withdraw_requests ===\n');
  
  try {
    // 1. Проверяем подключение к Supabase
    console.log('1. Проверка подключения к Supabase...');
    console.log('   URL:', process.env.SUPABASE_URL ? 'Установлен' : 'НЕ УСТАНОВЛЕН');
    console.log('   KEY:', process.env.SUPABASE_KEY ? 'Установлен' : 'НЕ УСТАНОВЛЕН');

    // 2. Пробуем простой SELECT
    console.log('\n2. Попытка SELECT из withdraw_requests...');
    const { data, error, status } = await supabase
      .from('withdraw_requests')
      .select('id')
      .limit(1);

    console.log('   Статус ответа:', status);
    
    if (error) {
      console.log('   Ошибка:', error.message);
      console.log('   Код ошибки:', error.code);
      console.log('   Детали:', error.details);
      
      if (error.code === 'PGRST116') {
        console.log('\n❌ Таблица withdraw_requests НЕ СУЩЕСТВУЕТ!');
        console.log('\nШаги для создания:');
        console.log('1. Откройте Supabase Dashboard');
        console.log('2. Перейдите в SQL Editor');
        console.log('3. Выполните содержимое файла create-withdrawal-table.sql');
      }
    } else {
      console.log('✅ Таблица существует и доступна!');
      console.log('   Записей в таблице:', data ? data.length : 0);
    }

    // 3. Проверяем другие таблицы для сравнения
    console.log('\n3. Проверка таблицы users для сравнения...');
    const { error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (!usersError) {
      console.log('✅ Таблица users доступна (подключение работает)');
    } else {
      console.log('❌ Проблема с подключением к Supabase');
    }

  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error);
  }
}

simpleCheck();