/**
 * Скрипт для проверки подключения к Neon DB в продакшн-среде
 * Поможет выявить причину ошибки Service Unavailable
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const { Pool } = pg;

console.log('==================================');
console.log('ПРОВЕРКА ПОДКЛЮЧЕНИЯ К NEON DB');
console.log('==================================');

// Вывод информации о переменных окружения (без показа самих значений)
console.log('Проверка переменных окружения:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Установлена' : '❌ Отсутствует');
console.log('NEON_DB_URL:', process.env.NEON_DB_URL ? '✅ Установлена' : '❌ Отсутствует');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ Установлена' : '❌ Отсутствует');

// Настраиваем конфигурацию для Neon DB с явными SSL параметрами
const dbConfig = {
  connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL,
  ssl: {
    rejectUnauthorized: false,
    require: true
  },
  // Эти настройки помогут диагностировать проблемы с подключением
  connectionTimeoutMillis: 10000, // 10 секунд на подключение
  query_timeout: 10000, // 10 секунд на запрос
  statement_timeout: 10000, // 10 секунд на выполнение запроса
  idle_in_transaction_session_timeout: 10000 // 10 секунд простоя в транзакции
};

// Создаем пул подключений
console.log('Настройка пула подключений...');
const pool = new Pool(dbConfig);

// Настройка обработчика ошибок пула
pool.on('error', (err) => {
  console.error('Неожиданная ошибка пула подключений:', err);
});

// Функция для тестирования подключения
async function testConnection() {
  let client;
  
  try {
    console.log('Попытка получить клиент из пула...');
    client = await pool.connect();
    
    console.log('Клиент получен, проверка подключения...');
    const result = await client.query('SELECT NOW() as time');
    
    console.log('✅ Подключение успешно!');
    console.log('Текущее время сервера:', result.rows[0].time);
    
    // Проверяем таблицы
    console.log('Проверка схемы базы данных...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('⚠️ Не найдено таблиц в схеме public');
    } else {
      console.log('Найдены таблицы:');
      tablesResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.table_name}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка при подключении к базе данных:');
    console.error(error);
    
    // Расширенная диагностика проблем
    if (error.code === 'ENOTFOUND') {
      console.error('⚠️ Не удалось найти хост базы данных. Проверьте правильность URL.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('⚠️ Превышено время ожидания подключения к базе данных.');
      console.error('   Проверьте, что сервер базы данных доступен и не блокируется файрволом.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('⚠️ Подключение отклонено. Проверьте, что сервер базы данных запущен и доступен.');
    } else if (error.message.includes('does not support SSL')) {
      console.error('⚠️ Проблема с SSL подключением. Neon DB требует SSL.');
    }
    
    return false;
  } finally {
    if (client) {
      console.log('Освобождение клиента...');
      client.release();
    }
  }
}

// Функция для проверки прав доступа к таблицам
async function checkTablePermissions() {
  try {
    const client = await pool.connect();
    try {
      // Получаем список таблиц
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      const tableNames = tablesResult.rows.map(row => row.table_name);
      
      console.log('\nПроверка прав доступа к таблицам:');
      
      // Проверяем SELECT для каждой таблицы
      for (const tableName of tableNames) {
        try {
          await client.query(`SELECT COUNT(*) FROM "${tableName}" LIMIT 1`);
          console.log(`✅ SELECT для таблицы "${tableName}" работает`);
        } catch (error) {
          console.error(`❌ Ошибка SELECT для таблицы "${tableName}":`, error.message);
        }
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Ошибка при проверке прав доступа к таблицам:', error);
  }
}

// Функция для генерации секретного ключа сессии
function generateSessionSecret() {
  // Генерируем криптографически стойкий ключ для сессии
  return crypto.randomBytes(32).toString('hex');
}

// Тестируем подключение
(async () => {
  try {
    // Проверяем и генерируем SESSION_SECRET, если он не установлен
    if (!process.env.SESSION_SECRET) {
      const sessionSecret = generateSessionSecret();
      console.log('\n⚠️ Переменная SESSION_SECRET не установлена!');
      console.log('Рекомендуется добавить в переменные окружения:');
      console.log(`SESSION_SECRET=${sessionSecret}`);
    }
    
    console.log('\nТестирование подключения к базе данных...');
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('\n✅ Подключение к базе данных работает корректно');
      
      // Проверяем права доступа к таблицам
      await checkTablePermissions();
    } else {
      console.error('\n❌ Не удалось подключиться к базе данных');
      console.log('\nРекомендации:');
      console.log('1. Проверьте, что переменные DATABASE_URL и NEON_DB_URL установлены корректно');
      console.log('2. Убедитесь, что база данных Neon DB активна и доступна');
      console.log('3. Попробуйте подключиться к базе данных из другого инструмента для проверки');
    }
  } catch (error) {
    console.error('Необработанная ошибка:', error);
  } finally {
    // Завершаем работу пула подключений
    await pool.end();
    console.log('\nПул подключений закрыт');
  }
})();