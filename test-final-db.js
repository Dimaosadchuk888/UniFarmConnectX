#!/usr/bin/env node
/**
 * Финальный тест подключения к базе данных
 * Проверяет единое подключение через DATABASE_URL
 */

import pg from 'pg';
const { Client } = pg;

async function testFinalConnection() {
  console.log('Финальный тест подключения к базе данных...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('Подключение установлено');
    
    // Выполняем SQL-запрос
    const result = await client.query('SELECT current_database(), current_schema(), inet_server_addr();');
    
    console.log('База данных:', result.rows[0].current_database);
    console.log('Схема:', result.rows[0].current_schema);
    console.log('IP сервера:', result.rows[0].inet_server_addr);
    
    await client.end();
    return true;
    
  } catch (error) {
    console.error('Ошибка:', error.message);
    await client.end().catch(() => {});
    return false;
  }
}

testFinalConnection()
  .then(success => process.exit(success ? 0 : 1))
  .catch(() => process.exit(1));