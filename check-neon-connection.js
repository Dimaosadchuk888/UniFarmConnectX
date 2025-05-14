/**
 * Скрипт для проверки подключения к Neon DB
 */

require('dotenv').config(); // Загружаем переменные из .env

const { Pool } = require('pg');

async function checkNeonConnection() {
  // Проверяем наличие URL для подключения
  if (!process.env.DATABASE_URL) {
    console.error('❌ Ошибка: DATABASE_URL не установлен в переменных окружения');
    console.log('Пожалуйста, добавьте DATABASE_URL в файл .env');
    return false;
  }

  console.log('🔄 Подключение к Neon DB...');
  console.log(`URL подключения: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);

  // Создаем пул соединений
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Для обхода проблем с SSL-сертификатами
    }
  });

  try {
    // Проверяем соединение простым запросом
    const result = await pool.query('SELECT NOW() as time');
    console.log(`✅ Подключение успешно! Время сервера: ${result.rows[0].time}`);

    // Получаем список таблиц
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`\n📋 Список таблиц (${tablesResult.rows.length}):`);
    tablesResult.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.table_name}`);
    });

    // Проверяем количество записей в таблице пользователей
    try {
      const usersCount = await pool.query('SELECT COUNT(*) FROM users');
      console.log(`\n👥 Количество пользователей: ${usersCount.rows[0].count}`);
    } catch (err) {
      console.log('\n❓ Не удалось получить информацию о пользователях:', err.message);
    }

    return true;
  } catch (err) {
    console.error(`❌ Ошибка подключения: ${err.message}`);
    console.error(err.stack);
    return false;
  } finally {
    // Закрываем пул соединений
    await pool.end();
  }
}

// Запускаем проверку
checkNeonConnection()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Непредвиденная ошибка:', err);
    process.exit(1);
  });