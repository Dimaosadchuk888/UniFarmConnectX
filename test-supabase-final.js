#!/usr/bin/env node
/**
 * Финальный тест подключения к Supabase
 * Проверяет правильность подключения через DATABASE_URL
 */

import pg from 'pg';
const { Client } = pg;

async function testSupabaseFinal() {
  console.log('🔍 Финальный тест подключения к Supabase...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL не установлен');
    return false;
  }
  
  console.log('DATABASE_URL:', process.env.DATABASE_URL.substring(0, 50) + '...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('✅ Подключение к Supabase установлено');
    
    // Выполняем запрашиваемый SQL-запрос
    const result = await client.query('SELECT current_database(), current_schema(), inet_server_addr();');
    
    console.log('📊 Результат SQL-запроса:');
    console.log('  База данных:', result.rows[0].current_database);
    console.log('  Схема:', result.rows[0].current_schema);
    console.log('  IP сервера:', result.rows[0].inet_server_addr);
    
    // Проверяем IP адрес - должен быть Supabase, не Neon
    const serverIP = result.rows[0].inet_server_addr;
    if (serverIP === '169.254.254.254') {
      console.log('⚠️  ВНИМАНИЕ: IP 169.254.254.254 - это Neon, не Supabase!');
      return false;
    } else {
      console.log('✅ IP сервера соответствует Supabase');
    }
    
    await client.end();
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    if (error.code) {
      console.error('Код ошибки:', error.code);
    }
    await client.end().catch(() => {});
    return false;
  }
}

testSupabaseFinal()
  .then(success => {
    if (success) {
      console.log('🎉 Подключение к Supabase работает корректно');
    } else {
      console.log('💥 Проблема с подключением к Supabase');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });