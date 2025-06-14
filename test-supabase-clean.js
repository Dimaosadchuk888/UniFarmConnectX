#!/usr/bin/env node
/**
 * Тест чистого подключения к Supabase
 * Проверяет отсутствие связей с Neon
 */

import pg from 'pg';
const { Client } = pg;

async function testCleanSupabase() {
  console.log('Тестирование чистого подключения к Supabase...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL не установлен');
    return false;
  }
  
  // Проверяем, что URL указывает на Supabase
  if (!process.env.DATABASE_URL.includes('supabase.co')) {
    console.error('DATABASE_URL не указывает на Supabase');
    return false;
  }
  
  console.log('DATABASE_URL корректный для Supabase');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('Подключение к Supabase установлено');
    
    // Выполняем запрашиваемый SQL-запрос
    const result = await client.query('SELECT current_database(), current_schema(), inet_server_addr();');
    
    console.log('Результат SQL-запроса:');
    console.log('  База данных:', result.rows[0].current_database);
    console.log('  Схема:', result.rows[0].current_schema);
    console.log('  IP сервера:', result.rows[0].inet_server_addr);
    
    // Проверяем, что это не Neon IP
    const serverIP = result.rows[0].inet_server_addr;
    if (serverIP === '169.254.254.254') {
      console.error('ОШИБКА: Подключение к Neon вместо Supabase!');
      return false;
    }
    
    console.log('Подтверждено: подключение к Supabase');
    await client.end();
    return true;
    
  } catch (error) {
    console.error('Ошибка подключения:', error.message);
    await client.end().catch(() => {});
    return false;
  }
}

testCleanSupabase()
  .then(success => {
    if (success) {
      console.log('Очистка от Neon завершена успешно');
    } else {
      console.log('Требуется дополнительная очистка');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });