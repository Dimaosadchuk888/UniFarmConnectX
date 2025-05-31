/**
 * Скрипт для проверки подключения к Neon DB
 * - Проверяет наличие переменных окружения Neon DB
 * - Пытается выполнить подключение и запрос к базе данных
 * - Выводит результаты проверки
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');
const colors = require('../server/utils/colors');

// Устанавливаем переменные окружения для Neon DB
process.env.DATABASE_PROVIDER = 'neon';
process.env.FORCE_NEON_DB = 'true';
process.env.DISABLE_REPLIT_DB = 'true';
process.env.OVERRIDE_DB_PROVIDER = 'neon';

// Проверка наличия переменных окружения
console.log('===============================================');
console.log(colors.blue('ПРОВЕРКА ПОДКЛЮЧЕНИЯ К NEON DB'));
console.log('===============================================');

// Проверка DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error(colors.red('❌ Переменная окружения DATABASE_URL не найдена!'));
  console.log('Для корректной работы приложения требуется установить DATABASE_URL');
  process.exit(1);
}

// Маскируем пароль в URL для вывода
const maskedUrl = dbUrl.replace(/\/\/([^:]+):([^@]+)@/, '//\\1:***@');
console.log(`DATABASE_URL = ${maskedUrl}`);

// Проверка подключения
console.log(colors.blue('\nПроверка подключения к базе данных...'));

const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

// Проверка соединения с базой данных
(async () => {
  try {
    console.log('Подключение к базе данных...');
    const client = await pool.connect();
    console.log(colors.green('✅ Успешное подключение к Neon DB!'));
    
    // Проверка версии PostgreSQL
    const versionResult = await client.query('SELECT version()');
    console.log('Версия PostgreSQL:', versionResult.rows[0].version);
    
    // Проверка таблиц в базе данных
    console.log('\n' + colors.blue('Проверка таблиц в базе данных...'));
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log(colors.yellow('⚠️ Таблицы не найдены в схеме public'));
    } else {
      console.log(colors.green(`✅ Найдено ${tablesResult.rows.length} таблиц:`));
      tablesResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });
    }
    
    // Проверка партиционирования таблицы transactions
    console.log('\n' + colors.blue('Проверка партиционирования таблицы transactions...'));
    const checkPartitioning = await client.query(`
      SELECT 
        pg_get_partkeydef(c.oid) as partition_key
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'transactions' AND n.nspname = 'public' AND c.relkind = 'p';
    `);
    
    if (checkPartitioning.rows.length === 0) {
      console.log(colors.yellow('⚠️ Таблица transactions не партицирована'));
    } else {
      console.log(colors.green('✅ Таблица transactions партицирована по:', checkPartitioning.rows[0].partition_key));

      // Получение списка партиций
      const partitionsResult = await client.query(`
        SELECT
          child.relname as partition_name,
          pg_get_expr(child.relpartbound, child.oid) as partition_expression
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
        JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
        JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
        WHERE parent.relname='transactions'
        AND nmsp_parent.nspname='public'
        ORDER BY child.relname;
      `);

      if (partitionsResult.rows.length === 0) {
        console.log(colors.yellow('⚠️ Партиции для таблицы transactions не найдены'));
      } else {
        console.log(colors.green(`✅ Найдено ${partitionsResult.rows.length} партиций для таблицы transactions:`));
        partitionsResult.rows.forEach((row, index) => {
          console.log(`   ${index + 1}. ${row.partition_name}: ${row.partition_expression}`);
        });
      }
    }
    
    client.release();
    console.log('\n' + colors.green('✅ Проверка подключения к Neon DB успешно завершена!'));
    
  } catch (error) {
    console.error(colors.red('❌ Ошибка при подключении к Neon DB:'), error);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();