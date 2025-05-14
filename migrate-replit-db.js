/**
 * Скрипт для миграции схемы базы данных на Replit PostgreSQL
 * 
 * Этот скрипт выполняет следующие действия:
 * 1. Проверяет наличие необходимых переменных окружения
 * 2. Устанавливает соединение с базой данных
 * 3. Сбрасывает и создает заново схему базы данных
 * 4. Выполняет необходимые миграции
 * 
 * Использование:
 * node migrate-replit-db.js
 */

import { execSync } from 'child_process';
import pg from 'pg';
const { Pool } = pg;

// Переменные для подключения к БД
const pgHost = process.env.PGHOST || 'localhost';
const pgUser = process.env.PGUSER || 'runner';
const pgPassword = process.env.PGPASSWORD || '';
const pgDatabase = process.env.PGDATABASE || 'postgres';
const pgPort = parseInt(process.env.PGPORT || '5432', 10);

// Объект конфигурации для подключения к PostgreSQL на Replit
const connectionConfig = {
  host: pgHost,
  port: pgPort,
  user: pgUser,
  password: pgPassword,
  database: pgDatabase,
  // Отключаем SSL для локальных соединений
  ssl: pgHost === 'localhost' ? false : undefined
};

// Создаем пул соединений
const pool = new Pool(connectionConfig);

/**
 * Основная функция, выполняющая миграцию
 */
async function migrateDatabase() {
  console.log('[migrate-replit-db] Запуск миграции на Replit PostgreSQL...');
  console.log(`[migrate-replit-db] Подключение к БД: ${pgHost}:${pgPort}/${pgDatabase}`);

  try {
    // Проверяем соединение
    await testConnection();

    // Выполняем миграцию с помощью Drizzle
    console.log('[migrate-replit-db] Выполнение миграции с помощью Drizzle...');
    
    // Устанавливаем DATABASE_URL для Drizzle
    process.env.DATABASE_URL = `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}`;
    
    // Запускаем команду Drizzle для миграции (push схемы в БД)
    execSync('npx drizzle-kit push:pg', { stdio: 'inherit' });
    
    console.log('[migrate-replit-db] Миграция успешно выполнена');
  } catch (error) {
    console.error('[migrate-replit-db] Ошибка миграции:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Проверяет соединение с БД
 */
async function testConnection() {
  try {
    const result = await pool.query('SELECT current_database() as db_name');
    console.log(`[migrate-replit-db] Успешное подключение к базе данных ${result.rows[0].db_name}`);
    return true;
  } catch (error) {
    console.error('[migrate-replit-db] Ошибка подключения к базе данных:', error.message);
    throw error;
  }
}

// Запускаем миграцию
migrateDatabase().catch(err => {
  console.error('[migrate-replit-db] Критическая ошибка:', err.message);
  process.exit(1);
});