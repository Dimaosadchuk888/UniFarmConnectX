#!/usr/bin/env node
/**
 * Прямой тест подключения к Supabase PostgreSQL
 * Выполняет запрашиваемый SQL через pg библиотеку
 */

import pg from 'pg';
const { Client } = pg;

async function testDirectConnection() {
  console.log('🔍 Прямое тестирование подключения к Supabase...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL не установлен');
    return false;
  }
  
  console.log('DATABASE_URL длина:', process.env.DATABASE_URL.length);
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('✅ Подключение установлено');
    
    // Выполняем запрашиваемый SQL-запрос
    const result = await client.query(`
      SELECT current_database(), current_schema(), inet_server_addr();
    `);
    
    console.log('📊 Результат запроса:');
    console.log('  База данных:', result.rows[0].current_database);
    console.log('  Схема:', result.rows[0].current_schema);
    console.log('  IP сервера:', result.rows[0].inet_server_addr);
    
    // Проверяем доступные таблицы
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📋 Доступные таблицы:');
    if (tablesResult.rows.length === 0) {
      console.log('  Таблицы не найдены в схеме public');
    } else {
      tablesResult.rows.forEach(row => {
        console.log('  -', row.table_name);
      });
    }
    
    await client.end();
    console.log('🎉 Тест подключения к Supabase завершен успешно');
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

testDirectConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });