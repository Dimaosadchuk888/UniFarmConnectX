#!/usr/bin/env node
/**
 * Тест подключения к правильной базе данных Neon
 */

import pg from 'pg';
const { Client } = pg;

async function testCorrectDatabase() {
  console.log('Тестирование подключения к рабочей базе данных...');
  
  // Используем правильные переменные окружения
  const connectionString = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
  
  console.log('Подключение к:', process.env.PGHOST);
  console.log('База данных:', process.env.PGDATABASE);
  console.log('Пользователь:', process.env.PGUSER);
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('Подключение установлено успешно');
    
    // Выполняем запрашиваемый SQL-запрос
    const result = await client.query('SELECT current_database(), current_schema(), inet_server_addr();');
    
    console.log('Результат запроса:');
    console.log('  База данных:', result.rows[0].current_database);
    console.log('  Схема:', result.rows[0].current_schema);
    console.log('  IP сервера:', result.rows[0].inet_server_addr);
    
    // Проверяем таблицы в схеме public
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('Доступные таблицы:');
    if (tablesResult.rows.length === 0) {
      console.log('  Таблицы не найдены в схеме public');
    } else {
      tablesResult.rows.forEach(row => {
        console.log('  -', row.table_name);
      });
    }
    
    await client.end();
    console.log('Тест завершен успешно');
    return true;
    
  } catch (error) {
    console.error('Ошибка подключения:', error.message);
    await client.end().catch(() => {});
    return false;
  }
}

testCorrectDatabase()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });