/**
 * Улучшенный скрипт для подключения к Neon с правильными SSL-настройками
 */

import { Pool } from 'pg';

// Установка переменных окружения для SSL
process.env.PGSSLMODE = 'require';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Создание пула соединений с расширенными настройками
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Более строгие настройки таймаута
  connectionTimeoutMillis: 10000,
  query_timeout: 10000,
  // Увеличение времени ожидания подключения
  idle_in_transaction_session_timeout: 10000
});

console.log('🚀 Подключение к базе данных Neon с улучшенными настройками SSL...');
console.log(`Использую DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@/')}`);
console.log(`PGSSLMODE: ${process.env.PGSSLMODE}`);

// Выполнение запроса с обработкой ошибок
pool.query('SELECT current_database() as db, current_schema() as schema')
  .then(res => {
    console.log('\n✅ Успешное подключение к базе данных!');
    console.log(`📊 База данных: ${res.rows[0].db}, Схема: ${res.rows[0].schema}`);
    
    // Проверяем таблицу users
    return pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as exists
    `);
  })
  .then(res => {
    if (res.rows[0].exists) {
      console.log('\n✅ Таблица users существует');
      
      // Получаем последних 10 пользователей
      return pool.query('SELECT * FROM users ORDER BY id DESC LIMIT 10');
    } else {
      console.log('\n❌ Таблица users не существует');
      return { rows: [] };
    }
  })
  .then(res => {
    if (res.rows.length > 0) {
      console.log(`\n📋 Найдено ${res.rows.length} пользователей:`);
      res.rows.forEach((user, index) => {
        console.log(`\n--- Пользователь ${index + 1} ---`);
        Object.entries(user).forEach(([key, value]) => {
          if (key === 'password' || key === 'password_hash') {
            console.log(`${key}: [СКРЫТО]`);
          } else {
            console.log(`${key}: ${value}`);
          }
        });
      });
    }
    
    // Закрытие соединения
    console.log('\n🔄 Закрытие соединения...');
    return pool.end();
  })
  .then(() => {
    console.log('✅ Соединение закрыто');
  })
  .catch(err => {
    console.error('\n❌ Ошибка:', err.message);
    console.error('Детали ошибки:', err);
    
    // Закрытие соединения в случае ошибки
    pool.end().then(() => {
      console.log('🔄 Соединение закрыто после ошибки');
    });
  });