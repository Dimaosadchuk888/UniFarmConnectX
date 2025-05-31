/**
 * Скрипт для прямой проверки подключения к Neon DB
 * Использует прямое подключение через модуль db-neon-direct
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

// Настраиваем WebSocket для Neon
neonConfig.webSocketConstructor = ws;

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
    const envFile = readFileSync('.env.neon', 'utf8');
    const envVars = {};
    
    envFile.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, value] = line.split('=').map(part => part.trim());
        if (key && value) {
          envVars[key] = value;
          process.env[key] = value;
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
  log('🔍 Прямая проверка подключения к Neon DB...', colors.blue);
  
  // Загружаем переменные окружения
  const envVars = loadEnvFromFile();
  
  if (!process.env.DATABASE_URL && !envVars.DATABASE_URL) {
    log('❌ Переменная DATABASE_URL не найдена. Пожалуйста, укажите её в .env.neon', colors.red);
    return false;
  }
  
  const connectionString = process.env.DATABASE_URL;
  const maskedUrl = connectionString.replace(/:[^:]*@/, ':***@');
  
  log(`📝 Используемая строка подключения: ${maskedUrl}`, colors.yellow);
  
  try {
    // Создаем пул подключений
    const pool = new Pool({ 
      connectionString,
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
      } catch (err) {
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