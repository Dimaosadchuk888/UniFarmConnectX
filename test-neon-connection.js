/**
 * Скрипт для проверки подключения к обновленной базе данных Neon
 */

import { Pool } from 'pg';

console.log('🚀 Проверка соединения с Neon DB (новый тариф)...');
console.log(`Используем DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@/')}`);

// Создание пула соединений с оптимальными настройками
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  query_timeout: 10000
});

async function testConnection() {
  try {
    console.log('Подключение к базе данных...');
    
    // Запрос базовой информации
    const dbInfoResult = await pool.query('SELECT current_database() as db, current_schema() as schema, version() as version');
    
    console.log('\n✅ Успешное соединение с базой данных!');
    console.log('📊 Информация о базе данных:');
    console.log(`База данных: ${dbInfoResult.rows[0].db}`);
    console.log(`Схема: ${dbInfoResult.rows[0].schema}`);
    console.log(`Версия PostgreSQL: ${dbInfoResult.rows[0].version}`);
    
    // Проверка доступности таблицы users
    console.log('\n📋 Проверка таблицы users...');
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as exists
    `);
    
    if (tableCheckResult.rows[0].exists) {
      console.log('✅ Таблица users существует');
      
      // Выполнение запроса к таблице users
      console.log('\n📊 Получение данных из таблицы users...');
      const usersResult = await pool.query('SELECT * FROM users ORDER BY id DESC LIMIT 10');
      
      console.log(`Найдено ${usersResult.rows.length} пользователей`);
      
      if (usersResult.rows.length > 0) {
        console.log('\n📋 Последние 10 пользователей:');
        usersResult.rows.forEach((user, index) => {
          console.log(`\n--- Пользователь ${index + 1} ---`);
          for (const [key, value] of Object.entries(user)) {
            if (key === 'password' || key === 'password_hash') {
              console.log(`${key}: [СКРЫТО]`);
            } else {
              console.log(`${key}: ${value}`);
            }
          }
        });
      }
    } else {
      console.log('❌ Таблица users не существует');
    }
    
    // Проверяем другие ключевые таблицы
    console.log('\n📋 Проверка других таблиц...');
    const allTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('Доступные таблицы:');
    allTablesResult.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('\n❌ Ошибка при подключении к базе данных:', error.message);
    console.error('Детали ошибки:', error);
  } finally {
    // Закрытие соединения
    await pool.end();
    console.log('\n🔄 Соединение закрыто');
  }
}

// Запуск проверки
testConnection().catch(error => {
  console.error('Неперехваченная ошибка:', error);
});