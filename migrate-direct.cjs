/**
 * Прямая миграция схемы в PostgreSQL на Replit
 * 
 * Этот скрипт создает SQL-запросы для создания таблиц
 * на основе схемы Drizzle и выполняет их напрямую
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Настройка цветов для вывода
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

/**
 * Выводит сообщение в консоль с цветом
 */
function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

/**
 * Загружает переменные окружения из .env.replit
 */
function loadEnvFromReplit() {
  const replitEnvPath = path.join(process.cwd(), '.env.replit');
  
  if (!fs.existsSync(replitEnvPath)) {
    log(`❌ Файл .env.replit не найден!`, colors.red);
    process.exit(1);
  }
  
  log(`📝 Загрузка переменных окружения из .env.replit...`, colors.blue);
  const envConfig = dotenv.parse(fs.readFileSync(replitEnvPath));
  
  // Устанавливаем принудительное использование Replit PostgreSQL
  envConfig.DATABASE_PROVIDER = 'replit';
  envConfig.USE_LOCAL_DB_ONLY = 'true';
  
  // Применяем переменные окружения
  for (const key in envConfig) {
    process.env[key] = envConfig[key];
  }
  
  log(`✅ Переменные окружения успешно загружены из .env.replit`, colors.green);
}

/**
 * Проверяет, запущен ли PostgreSQL
 */
function checkPostgreSQLRunning() {
  log(`🔍 Проверка состояния PostgreSQL...`, colors.blue);
  
  try {
    const pgSocketPath = process.env.PGSOCKET || path.join(process.env.HOME, '.postgresql', 'sockets');
    const result = execSync(`PGHOST=${pgSocketPath} PGUSER=${process.env.PGUSER} psql -d postgres -c "SELECT 1" -t`).toString().trim();
    
    if (result === '1') {
      log(`✅ PostgreSQL запущен и доступен`, colors.green);
      return true;
    } else {
      log(`⚠️ PostgreSQL запущен, но возвращает неожиданный результат: ${result}`, colors.yellow);
      return false;
    }
  } catch (err) {
    log(`❌ PostgreSQL не запущен или недоступен: ${err.message}`, colors.red);
    return false;
  }
}

/**
 * Запускает PostgreSQL через скрипт start-postgres.sh
 */
function startPostgreSQL() {
  log(`🚀 Запуск PostgreSQL...`, colors.blue);
  
  try {
    execSync('bash ./start-postgres.sh', { stdio: 'inherit' });
    log(`✅ PostgreSQL успешно запущен`, colors.green);
    return true;
  } catch (err) {
    log(`❌ Не удалось запустить PostgreSQL: ${err.message}`, colors.red);
    return false;
  }
}

/**
 * Создаёт основные SQL запросы для таблиц
 */
async function createBasicTables() {
  log(`\n${colors.blue}=== Создание основных таблиц ===${colors.reset}`);
  
  // Создаем подключение к базе данных
  const pgSocketPath = process.env.PGSOCKET || path.join(process.env.HOME, '.postgresql', 'sockets');
  const pool = new Pool({
    host: pgSocketPath,
    user: process.env.PGUSER || 'runner',
    database: process.env.PGDATABASE || 'postgres',
    password: process.env.PGPASSWORD || '',
    port: parseInt(process.env.PGPORT || '5432'),
  });
  
  try {
    // Массив запросов на создание таблиц
    const createTableQueries = [
      // Таблица auth_users
      `CREATE TABLE IF NOT EXISTS auth_users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT DEFAULT 'telegram_auth'
      )`,
      
      // Таблица users
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE,
        guest_id TEXT UNIQUE,
        username TEXT,
        wallet TEXT,
        ton_wallet_address TEXT,
        ref_code TEXT UNIQUE,
        parent_ref_code TEXT,
        balance_uni NUMERIC(18, 6) DEFAULT 0,
        balance_ton NUMERIC(18, 6) DEFAULT 0,
        uni_deposit_amount NUMERIC(18, 6) DEFAULT 0,
        uni_farming_start_timestamp TIMESTAMP,
        uni_farming_balance NUMERIC(18, 6) DEFAULT 0,
        uni_farming_rate NUMERIC(18, 6) DEFAULT 0,
        uni_farming_last_update TIMESTAMP,
        uni_farming_deposit NUMERIC(18, 6) DEFAULT 0,
        uni_farming_activated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        checkin_last_date TIMESTAMP,
        checkin_streak INTEGER DEFAULT 0
      )`,
      
      // Индексы для таблицы users
      `CREATE INDEX IF NOT EXISTS idx_users_parent_ref_code ON users (parent_ref_code)`,
      `CREATE INDEX IF NOT EXISTS idx_users_ref_code ON users (ref_code)`,
      
      // Таблица farming_deposits
      `CREATE TABLE IF NOT EXISTS farming_deposits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        amount_uni NUMERIC(18, 6),
        rate_uni NUMERIC(5, 2),
        rate_ton NUMERIC(5, 2),
        created_at TIMESTAMP DEFAULT NOW(),
        last_claim TIMESTAMP,
        is_boosted BOOLEAN DEFAULT FALSE,
        deposit_type TEXT DEFAULT 'regular',
        boost_id INTEGER,
        expires_at TIMESTAMP
      )`,
      
      // Таблица transactions
      `CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type TEXT,
        currency TEXT,
        amount NUMERIC(18, 6),
        status TEXT DEFAULT 'confirmed',
        source TEXT,
        category TEXT,
        tx_hash TEXT,
        description TEXT,
        source_user_id INTEGER,
        wallet_address TEXT,
        data TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      
      // Индексы для таблицы transactions
      `CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_source_user_id ON transactions (source_user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions (type, status)`,
      
      // Таблица referrals
      `CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        inviter_id INTEGER NOT NULL REFERENCES users(id),
        level INTEGER NOT NULL,
        reward_uni NUMERIC(18, 6),
        ref_path JSONB[],
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      
      // Индексы для таблицы referrals
      `CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON referrals (user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_referrals_inviter_id ON referrals (inviter_id)`,
      `CREATE INDEX IF NOT EXISTS idx_referrals_user_inviter ON referrals (user_id, inviter_id)`,
      `CREATE INDEX IF NOT EXISTS idx_referrals_level ON referrals (level)`,
      
      // Таблица missions
      `CREATE TABLE IF NOT EXISTS missions (
        id SERIAL PRIMARY KEY,
        type TEXT,
        title TEXT,
        description TEXT,
        reward_uni NUMERIC(18, 6),
        is_active BOOLEAN DEFAULT TRUE
      )`,
      
      // Таблица user_missions
      `CREATE TABLE IF NOT EXISTS user_missions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        mission_id INTEGER REFERENCES missions(id),
        completed_at TIMESTAMP DEFAULT NOW()
      )`,
      
      // Таблица uni_farming_deposits
      `CREATE TABLE IF NOT EXISTS uni_farming_deposits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount NUMERIC(18, 6) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        rate_per_second NUMERIC(20, 18) NOT NULL,
        last_updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        is_active BOOLEAN DEFAULT TRUE
      )`,
      
      // Таблица ton_boost_deposits
      `CREATE TABLE IF NOT EXISTS ton_boost_deposits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        ton_amount NUMERIC(18, 5) NOT NULL,
        bonus_uni NUMERIC(18, 6) NOT NULL,
        rate_ton_per_second NUMERIC(20, 18) NOT NULL,
        rate_uni_per_second NUMERIC(20, 18) NOT NULL,
        accumulated_ton NUMERIC(18, 10) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        last_updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        is_active BOOLEAN DEFAULT TRUE
      )`,
      
      // Таблица launch_logs
      `CREATE TABLE IF NOT EXISTS launch_logs (
        id SERIAL PRIMARY KEY,
        telegram_user_id BIGINT,
        ref_code TEXT,
        platform TEXT,
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
        user_agent TEXT,
        init_data TEXT,
        ip_address TEXT,
        request_id TEXT,
        user_id INTEGER REFERENCES users(id)
      )`,
      
      // Таблица partition_logs
      `CREATE TABLE IF NOT EXISTS partition_logs (
        id SERIAL PRIMARY KEY,
        operation TEXT NOT NULL,
        partition_name TEXT,
        message TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
        status TEXT NOT NULL,
        error_details TEXT
      )`,
      
      // Таблица reward_distribution_logs
      `CREATE TABLE IF NOT EXISTS reward_distribution_logs (
        id SERIAL PRIMARY KEY,
        batch_id TEXT NOT NULL,
        source_user_id INTEGER NOT NULL,
        earned_amount NUMERIC(18, 6) NOT NULL,
        currency TEXT NOT NULL,
        processed_at TIMESTAMP,
        status TEXT DEFAULT 'pending',
        levels_processed INTEGER,
        inviter_count INTEGER,
        total_distributed NUMERIC(18, 6),
        error_message TEXT,
        completed_at TIMESTAMP
      )`,
      
      // Таблица performance_metrics
      `CREATE TABLE IF NOT EXISTS performance_metrics (
        id SERIAL PRIMARY KEY,
        operation TEXT NOT NULL,
        batch_id TEXT,
        duration_ms NUMERIC(12, 2) NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
        details TEXT
      )`,
      
      // Индексы для таблицы performance_metrics
      `CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics (timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation ON performance_metrics (operation)`,
      `CREATE INDEX IF NOT EXISTS idx_performance_metrics_batch_id ON performance_metrics (batch_id)`
    ];
    
    // Выполняем запросы
    for (const query of createTableQueries) {
      log(`🔄 Выполнение SQL запроса...`, colors.blue);
      await pool.query(query);
      log(`✅ SQL запрос выполнен успешно`, colors.green);
    }
    
    log(`✅ Все таблицы успешно созданы`, colors.green);
    
    // Проверяем созданные таблицы
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    log(`📋 Список таблиц в базе данных:`, colors.cyan);
    console.table(result.rows.map(row => row.table_name));
    
    return true;
  } catch (error) {
    log(`❌ Ошибка при создании таблиц: ${error.message}`, colors.red);
    console.error(error);
    return false;
  } finally {
    // Закрываем подключение
    await pool.end();
  }
}

/**
 * Основная функция
 */
async function main() {
  // Показываем заголовок
  log(`\n${colors.magenta}=======================================${colors.reset}`);
  log(`${colors.magenta}= ПРЯМАЯ МИГРАЦИЯ СХЕМЫ В POSTGRESQL =${colors.reset}`);
  log(`${colors.magenta}=======================================${colors.reset}\n`);
  
  // Загружаем переменные окружения
  loadEnvFromReplit();
  
  // Проверяем, запущен ли PostgreSQL
  if (!checkPostgreSQLRunning()) {
    log(`🔄 PostgreSQL не запущен, пытаемся запустить...`, colors.yellow);
    if (!startPostgreSQL()) {
      log(`❌ Не удалось запустить PostgreSQL, миграция невозможна`, colors.red);
      process.exit(1);
    }
  }
  
  // Создаем основные таблицы
  if (await createBasicTables()) {
    log(`\n${colors.green}✅ Прямая миграция схемы успешно завершена!${colors.reset}`);
  } else {
    log(`\n${colors.red}❌ Не удалось выполнить миграцию схемы${colors.reset}`);
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch(err => {
  log(`\n❌ Критическая ошибка: ${err.message}`, colors.red);
  console.error(err);
  process.exit(1);
});