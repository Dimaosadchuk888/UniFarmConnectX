/**
 * Скрипт для проверки пользователей во встроенной БД Replit
 */

import pg from 'pg';
const { Pool } = pg;

async function runQueries() {
  console.log('🔄 Подключение к встроенной базе данных Replit...');
  
  // Подключение к встроенной БД Replit вместо внешней
  const pool = new Pool();
  
  try {
    // Первый запрос: получение текущей базы данных и схемы
    console.log('\n📊 Запрос 1: SELECT current_database(), current_schema()');
    const dbInfoResult = await pool.query('SELECT current_database() as db, current_schema() as schema');
    console.log('Результат:');
    console.log(`База данных: ${dbInfoResult.rows[0].db}`);
    console.log(`Схема: ${dbInfoResult.rows[0].schema}`);
    
    // Проверим, существует ли таблица users
    console.log('\n📊 Проверка существования таблицы users');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as exists
    `);
    
    if (tableCheck.rows[0].exists) {
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
    } else {
      console.log('⚠️ Таблица users не существует в этой базе данных');
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