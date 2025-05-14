/**
 * Скрипт для запуска приложения с Replit PostgreSQL
 * 
 * Выполняет следующие действия:
 * 1. Проверяет наличие необходимых переменных окружения для PostgreSQL
 * 2. Запускает миграцию базы данных (если нужно)
 * 3. Запускает сервер приложения
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Проверяем наличие всех переменных окружения
function checkEnvironmentVariables() {
  const requiredVars = ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGPORT'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`[start-with-replit-db] Отсутствуют переменные окружения: ${missingVars.join(', ')}`);
    console.error('[start-with-replit-db] Для использования Replit PostgreSQL необходимо создать базу данных через Replit Tools');
    return false;
  }
  
  return true;
}

// Запускает миграцию базы данных
function runDatabaseMigration() {
  console.log('[start-with-replit-db] Запуск миграции базы данных...');
  try {
    // Принудительно устанавливаем DATABASE_URL для Drizzle
    process.env.DATABASE_URL = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
    
    // Проверяем и запускаем скрипт миграции
    const migrationScript = path.join(process.cwd(), 'migrate-replit-db.js');
    if (fs.existsSync(migrationScript)) {
      execSync(`node ${migrationScript}`, { stdio: 'inherit' });
      console.log('[start-with-replit-db] Миграция базы данных успешно выполнена');
    } else {
      console.error('[start-with-replit-db] Скрипт миграции не найден:', migrationScript);
      console.log('[start-with-replit-db] Запускаем команду drizzle-kit push напрямую...');
      execSync('npx drizzle-kit push:pg', { stdio: 'inherit' });
    }
    
    return true;
  } catch (error) {
    console.error('[start-with-replit-db] Ошибка миграции базы данных:', error.message);
    return false;
  }
}

// Запускаем сервер приложения
function startApplicationServer() {
  console.log('[start-with-replit-db] Запуск сервера приложения...');
  
  // Устанавливаем переменную окружения для выбора Replit PostgreSQL
  process.env.DATABASE_PROVIDER = 'replit';
  
  try {
    // Пытаемся запустить production-server.mjs (ESM)
    if (fs.existsSync(path.join(process.cwd(), 'production-server.mjs'))) {
      console.log('[start-with-replit-db] Запуск production-server.mjs...');
      execSync('node production-server.mjs', { stdio: 'inherit' });
      return;
    }
    
    // Альтернатива - запуск стандартного сервера
    console.log('[start-with-replit-db] Запуск стандартного сервера...');
    execSync('npm start', { stdio: 'inherit' });
  } catch (error) {
    console.error('[start-with-replit-db] Ошибка запуска сервера:', error.message);
    process.exit(1);
  }
}

// Основная функция
function main() {
  console.log('[start-with-replit-db] Запуск приложения с Replit PostgreSQL...');
  
  // Проверяем наличие необходимых переменных окружения
  if (!checkEnvironmentVariables()) {
    console.error('[start-with-replit-db] Отсутствуют необходимые переменные окружения для Replit PostgreSQL');
    console.error('[start-with-replit-db] Использование стандартного DATABASE_URL без миграции');
    startApplicationServer();
    return;
  }
  
  // Запускаем миграцию базы данных
  const migrationSuccess = runDatabaseMigration();
  if (!migrationSuccess) {
    console.warn('[start-with-replit-db] Миграция не выполнена, но продолжаем запуск сервера');
  }
  
  // Запускаем сервер приложения
  startApplicationServer();
}

// Запуск
main();