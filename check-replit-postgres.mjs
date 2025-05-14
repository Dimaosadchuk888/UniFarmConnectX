/**
 * Проверка соединения с Replit PostgreSQL
 * 
 * Этот скрипт пытается обнаружить и подключиться к PostgreSQL на Replit,
 * используя переменные окружения, установленные create_postgresql_database_tool.
 */

import pg from 'pg';
const { Pool } = pg;

/**
 * Цвета для консоли
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Выводит сообщение в консоль с цветом
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Проверяет наличие необходимых переменных окружения
 */
function checkEnvironmentVariables() {
  log('Проверка переменных окружения...', colors.cyan);
  
  const requiredVars = ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log(`Отсутствуют необходимые переменные окружения: ${missingVars.join(', ')}`, colors.red);
    log('Для создания базы данных PostgreSQL:', colors.yellow);
    log('1. Используйте инструмент create_postgresql_database_tool в чате с ИИ', colors.yellow);
    log('2. Перезапустите терминал после создания базы данных', colors.yellow);
    return false;
  }
  
  log(`DATABASE_URL: ${process.env.DATABASE_URL.substring(0, 25)}...`, colors.green);
  log(`PGHOST: ${process.env.PGHOST}`, colors.green);
  log(`PGPORT: ${process.env.PGPORT}`, colors.green);
  log(`PGUSER: ${process.env.PGUSER}`, colors.green);
  log(`PGDATABASE: ${process.env.PGDATABASE}`, colors.green);
  log('Все необходимые переменные окружения найдены', colors.green);
  return true;
}

/**
 * Проверяет соединение с базой данных
 */
async function testConnection() {
  log('Проверка соединения с базой данных...', colors.cyan);
  
  try {
    const pool = new Pool({
      // Используем строку подключения напрямую
      connectionString: process.env.DATABASE_URL,
      // Настройки SSL в зависимости от хоста
      ssl: process.env.PGHOST?.includes('neon.tech') 
          ? { rejectUnauthorized: true } // Для Neon DB требуется SSL
          : false // Для локального Replit SSL не требуется
    });
    
    const client = await pool.connect();
    log('Соединение с базой данных успешно установлено!', colors.bright + colors.green);
    
    // Получение информации о базе данных
    const versionResult = await client.query('SELECT version()');
    log(`Версия PostgreSQL: ${versionResult.rows[0].version}`, colors.green);
    
    // Проверка существующих таблиц
    const tablesResult = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    
    if (tablesResult.rows.length > 0) {
      log(`Найдены таблицы в базе данных (всего: ${tablesResult.rows.length}):`, colors.green);
      tablesResult.rows.forEach(row => {
        log(`- ${row.table_name}`, colors.blue);
      });
    } else {
      log('В базе данных нет таблиц', colors.yellow);
      log('Необходимо выполнить миграцию схемы через Drizzle', colors.yellow);
      log('Выполните: node migrate-replit-db.mjs', colors.yellow);
    }
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    log(`Ошибка подключения к базе данных: ${error.message}`, colors.red);
    
    if (error.message.includes('connect ECONNREFUSED')) {
      log('Возможно, база данных не запущена или недоступна', colors.yellow);
    }
    
    return false;
  }
}

/**
 * Проверяет возможность создания таблицы
 */
async function testTableCreation() {
  if (!await testConnection()) {
    return false;
  }
  
  log('Проверка возможности создания таблицы...', colors.cyan);
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGHOST?.includes('neon.tech') 
          ? { rejectUnauthorized: true } 
          : false
    });
    
    // Создаем временную тестовую таблицу
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_replit_connection (
        id SERIAL PRIMARY KEY,
        test_value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Вставляем тестовую запись
    await pool.query(`
      INSERT INTO test_replit_connection (test_value)
      VALUES ('PostgreSQL на Replit работает!')
    `);
    
    // Читаем данные
    const result = await pool.query('SELECT * FROM test_replit_connection');
    log(`Тестовая запись создана: ${JSON.stringify(result.rows[0])}`, colors.green);
    
    // Удаляем тестовую таблицу
    await pool.query('DROP TABLE test_replit_connection');
    log('Тестовая таблица успешно создана и удалена', colors.green);
    
    await pool.end();
    return true;
  } catch (error) {
    log(`Ошибка при тестировании создания таблицы: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Основная функция
 */
async function main() {
  log('\n=== Проверка PostgreSQL на Replit ===\n', colors.bright + colors.blue);
  
  if (!checkEnvironmentVariables()) {
    return;
  }
  
  if (await testTableCreation()) {
    log('\n✅ PostgreSQL на Replit успешно настроен и работает!', colors.bright + colors.green);
    log('\nДля перехода на Replit PostgreSQL выполните:', colors.cyan);
    log('1. node migrate-replit-db.mjs - для миграции схемы', colors.yellow);
    log('2. DATABASE_PROVIDER=replit node server/index.ts - для запуска сервера', colors.yellow);
  } else {
    log('\n❌ Обнаружены проблемы с PostgreSQL на Replit', colors.bright + colors.red);
  }
}

// Запуск скрипта
main().catch(error => {
  log(`Критическая ошибка: ${error.message}`, colors.red);
});