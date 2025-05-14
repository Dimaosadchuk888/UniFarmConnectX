/**
 * Скрипт для проверки подключения к Neon DB
 * Использует pg вместо @neondatabase/serverless
 */

// Загружаем переменные окружения из .env.neon
import fs from 'fs';
import { Pool } from 'pg';
import 'dotenv/config';

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Вывод в консоль с цветами
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Загружаем переменные окружения из .env.neon
function loadEnvFromFile() {
  try {
    const envFile = fs.readFileSync('.env.neon', 'utf8');
    const envVars = {};
    
    envFile.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim();
          
          if (key && value) {
            envVars[key] = value;
            process.env[key] = value;
          }
        }
      }
    });
    
    return envVars;
  } catch (error) {
    log(`Ошибка при загрузке .env.neon: ${error.message}`, colors.red);
    return {};
  }
}

// Проверка подключения к Neon DB
async function checkNeonConnection() {
  log('🔍 Проверка подключения к Neon DB...', colors.blue);
  
  // Загружаем переменные окружения
  const envVars = loadEnvFromFile();
  
  if (!process.env.DATABASE_URL && !envVars.DATABASE_URL) {
    log('❌ Переменная DATABASE_URL не найдена. Пожалуйста, укажите её в .env.neon', colors.red);
    return false;
  }
  
  const connectionString = process.env.DATABASE_URL;
  const maskedUrl = connectionString.replace(/:[^:]*@/, ':***@');
  
  log(`📝 Используемая строка подключения: ${maskedUrl}`, colors.yellow);
  
  // Проверяем, содержит ли URL "neon"
  if (!connectionString.includes('neon')) {
    log('⚠️ URL не содержит "neon" - возможно, это не Neon DB?', colors.yellow);
  }
  
  // Проверяем наличие "sslmode=require"
  if (!connectionString.includes('sslmode=require')) {
    log('⚠️ URL не содержит "sslmode=require" - для Neon DB это обязательно!', colors.yellow);
  }
  
  try {
    // Создаем пул подключений
    const pool = new Pool({ 
      connectionString,
      ssl: {
        rejectUnauthorized: false // Для тестирования можно отключить проверку сертификата
      },
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000
    });
    
    // Проверяем подключение
    log('🔄 Выполнение тестового запроса...', colors.cyan);
    const result = await pool.query('SELECT version(), current_timestamp, pg_database_size(current_database())/1024/1024 as db_size_mb');
    
    log('\n✅ Подключение к Neon DB успешно установлено!', colors.green);
    log('\n📊 Информация о сервере:', colors.magenta);
    log(`PostgreSQL версия: ${result.rows[0].version}`, colors.reset);
    log(`Текущее время сервера: ${result.rows[0].current_timestamp}`, colors.reset);
    log(`Размер базы данных: ${Math.round(result.rows[0].db_size_mb)} MB`, colors.reset);
    
    // Проверяем таблицы
    log('\n📋 Получение списка таблиц...', colors.cyan);
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    // Получаем количество записей для каждой таблицы
    const tableStats = [];
    for (const row of tablesResult.rows) {
      try {
        const countResult = await pool.query(`SELECT count(*) FROM "${row.table_name}"`);
        tableStats.push({
          table_name: row.table_name,
          count: parseInt(countResult.rows[0].count)
        });
      } catch (error) {
        tableStats.push({
          table_name: row.table_name,
          count: 'Ошибка подсчета'
        });
      }
    }
    
    log('\n📋 Список таблиц:', colors.magenta);
    tableStats.forEach(table => {
      log(`${table.table_name}: ${table.count} записей`, colors.reset);
    });
    
    // Проверяем транзакционную таблицу на предмет партиционирования
    log('\n🔍 Проверка партиционирования таблицы transactions...', colors.cyan);
    
    try {
      const partitioningCheck = await pool.query(`
        SELECT pg_get_partkeydef(c.oid) as partition_key
        FROM pg_class c
        JOIN pg_inherits i ON i.inhparent = c.oid
        WHERE c.relname = 'transactions'
        LIMIT 1
      `);
      
      if (partitioningCheck.rowCount > 0 && partitioningCheck.rows[0].partition_key) {
        log('✅ Таблица transactions партиционирована!', colors.green);
        log(`Ключ партиционирования: ${partitioningCheck.rows[0].partition_key}`, colors.reset);
        
        // Проверяем партиции
        const partitionsCheck = await pool.query(`
          SELECT inhrelid::regclass AS partition_name
          FROM pg_inherits
          WHERE inhparent = 'transactions'::regclass
          ORDER BY inhrelid::regclass::text
        `);
        
        if (partitionsCheck.rowCount > 0) {
          log(`\nНайдено ${partitionsCheck.rowCount} партиций:`, colors.magenta);
          partitionsCheck.rows.forEach(row => {
            log(`- ${row.partition_name}`, colors.reset);
          });
        } else {
          log(`⚠️ Таблица transactions партиционирована, но партиции не найдены!`, colors.yellow);
        }
      } else {
        log('⚠️ Таблица transactions НЕ партиционирована!', colors.yellow);
      }
    } catch (error) {
      log(`❌ Ошибка при проверке партиционирования: ${error.message}`, colors.red);
    }
    
    // Закрываем пул
    await pool.end();
    
    return true;
  } catch (error) {
    log(`\n❌ Ошибка при подключении к Neon DB: ${error.message}`, colors.red);
    if (error.stack) {
      log(`Стек вызовов: ${error.stack}`, colors.red);
    }
    return false;
  }
}

// Запуск проверки
checkNeonConnection()
  .then(success => {
    if (success) {
      log('\n🎉 Проверка соединения с Neon DB успешно завершена!', colors.green);
    } else {
      log('\n⚠️ Не удалось установить соединение с Neon DB', colors.yellow);
    }
  })
  .catch(error => {
    log(`\n💥 Непредвиденная ошибка: ${error.message}`, colors.red);
    if (error.stack) {
      log(error.stack, colors.red);
    }
    process.exit(1);
  });