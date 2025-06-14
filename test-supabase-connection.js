#!/usr/bin/env node
/**
 * Test Supabase Database Connection
 * Verifies DATABASE_URL connection and runs the requested SQL query
 */

import { spawn } from 'child_process';

// Используем tsx для выполнения TypeScript кода
const testProcess = spawn('npx', ['tsx', '--eval', `
import { db } from './core/db.js';
import { sql } from 'drizzle-orm';

async function testSupabaseConnection() {
  console.log('🔍 Тестирование подключения к базе данных Supabase...');
  
  try {
    console.log('DATABASE_URL длина:', process.env.DATABASE_URL?.length || 0);
    
    // Выполняем запрашиваемый SQL-запрос
    const result = await db.execute(sql\`
      SELECT current_database(), current_schema(), inet_server_addr();
    \`);
    
    console.log('✅ Подключение к базе данных успешно!');
    console.log('Результат запроса:', result.rows[0]);
    
    // Проверяем существование таблиц
    const tablesResult = await db.execute(sql\`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    \`);
    
    console.log('📋 Доступные таблицы:');
    tablesResult.rows.forEach(row => {
      console.log('  -', row.table_name);
    });
    
    return {
      success: true,
      database: result.rows[0],
      tables: tablesResult.rows
    };
    
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error.message);
    
    // Дополнительная отладка
    if (error.code) {
      console.error('Код ошибки:', error.code);
    }
    if (error.detail) {
      console.error('Детали ошибки:', error.detail);
    }
    
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

// Запускаем тест
testSupabaseConnection()
  .then(result => {
    if (result.success) {
      console.log('\\n🎉 Тест подключения к Supabase завершен успешно');
      process.exit(0);
    } else {
      console.log('\\n💥 Тест подключения к Supabase провалился');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Ошибка выполнения теста:', error);
    process.exit(1);
  });
`], {
  stdio: 'inherit',
  env: process.env
});

testProcess.on('error', (error) => {
  console.error('❌ Ошибка запуска теста:', error.message);
  process.exit(1);
});

testProcess.on('exit', (code) => {
  process.exit(code || 0);
});