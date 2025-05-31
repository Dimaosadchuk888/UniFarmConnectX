/**
 * Скрипт для выполнения SQL-запросов и проверки пользователей
 */

import pg from 'pg';
const { Pool } = pg;

async function runQueries() {
  console.log('🔄 Подключение к базе данных...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Первый запрос: получение текущей базы данных и схемы
    console.log('\n📊 Запрос 1: SELECT current_database(), current_schema()');
    const dbInfoResult = await pool.query('SELECT current_database() as db, current_schema() as schema');
    console.log('Результат:');
    console.log(`База данных: ${dbInfoResult.rows[0].db}`);
    console.log(`Схема: ${dbInfoResult.rows[0].schema}`);
    
    // Второй запрос: получение последних 10 пользователей
    console.log('\n📊 Запрос 2: SELECT * FROM users ORDER BY id DESC LIMIT 10');
    const usersResult = await pool.query('SELECT * FROM users ORDER BY id DESC LIMIT 10');
    
    console.log('Результат (количество строк):', usersResult.rows.length);
    
    if (usersResult.rows.length > 0) {
      console.log('Пользователи:');
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
    } else {
      console.log('Пользователи не найдены');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при выполнении запросов:', error.message);
    console.error('Детали ошибки:', error);
  } finally {
    await pool.end();
    console.log('\n🔄 Соединение с базой данных закрыто');
  }
}

// Запуск
runQueries().catch(err => {
  console.error('❌ Необработанная ошибка:', err);
});