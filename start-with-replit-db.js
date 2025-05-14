/**
 * Скрипт для запуска приложения с Replit PostgreSQL
 * 
 * Выполняет следующие действия:
 * 1. Проверяет наличие необходимых переменных окружения для PostgreSQL
 * 2. Запускает миграцию базы данных (если нужно)
 * 3. Запускает сервер приложения
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Получаем путь к текущему скрипту
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Цвета для консоли
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
 * Проверяет наличие переменных окружения PostgreSQL
 */
function checkEnvironmentVariables() {
  log('Проверка переменных окружения...', colors.cyan);
  
  const requiredVars = ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log(`Отсутствуют необходимые переменные окружения: ${missingVars.join(', ')}`, colors.red);
    log('Пожалуйста, создайте базу данных PostgreSQL на Replit:', colors.yellow);
    log('1. Откройте вкладку "Secrets" (Секреты) в левой панели Replit', colors.yellow);
    log('2. Добавьте секрет с ключом "database-postgresql" и значением "true"', colors.yellow);
    log('3. Перезапустите этот скрипт', colors.yellow);
    return false;
  }
  
  log('Все необходимые переменные окружения найдены', colors.green);
  return true;
}

/**
 * Запускает миграцию базы данных
 */
function runDatabaseMigration() {
  log('Запуск миграции базы данных...', colors.cyan);
  
  try {
    // Проверяем наличие файла миграции
    const migrationFile = path.join(__dirname, 'migrate-replit-db.js');
    if (!fs.existsSync(migrationFile)) {
      log(`Файл миграции не найден: ${migrationFile}`, colors.red);
      return false;
    }
    
    // Запускаем миграцию
    execSync('node migrate-replit-db.js', { stdio: 'inherit' });
    
    log('Миграция успешно выполнена', colors.green);
    return true;
  } catch (error) {
    log(`Ошибка при выполнении миграции: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Запускает сервер приложения
 */
function startApplicationServer() {
  log('Запуск сервера с Replit PostgreSQL...', colors.cyan);
  
  try {
    // Устанавливаем переменную окружения, указывающую на использование Replit PostgreSQL
    process.env.DATABASE_PROVIDER = 'replit';
    
    // Запускаем сервер
    const server = spawn('node', ['server/index.ts'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_PROVIDER: 'replit'
      }
    });
    
    // Обработка событий сервера
    server.on('error', (error) => {
      log(`Ошибка при запуске сервера: ${error.message}`, colors.red);
    });
    
    server.on('close', (code) => {
      if (code !== 0) {
        log(`Сервер завершил работу с кодом: ${code}`, colors.red);
      } else {
        log('Сервер успешно завершил работу', colors.green);
      }
    });
    
    log('Сервер успешно запущен', colors.green);
    
    // Обработка сигналов завершения
    process.on('SIGINT', () => {
      log('\nЗавершение работы сервера...', colors.yellow);
      server.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
      log('\nЗавершение работы сервера...', colors.yellow);
      server.kill('SIGTERM');
    });
    
    return true;
  } catch (error) {
    log(`Ошибка при запуске сервера: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Главная функция
 */
function main() {
  log('=== Запуск приложения с Replit PostgreSQL ===', colors.bright + colors.blue);
  
  // Проверяем переменные окружения
  if (!checkEnvironmentVariables()) {
    process.exit(1);
  }
  
  // Запускаем миграцию
  const migrationSuccessful = runDatabaseMigration();
  if (!migrationSuccessful) {
    log('Пропускаем миграцию и пытаемся запустить сервер...', colors.yellow);
  }
  
  // Запускаем сервер
  startApplicationServer();
}

// Запускаем скрипт
main();