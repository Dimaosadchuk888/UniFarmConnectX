/**
 * Скрипт для запуска приложения с использованием PostgreSQL на Replit
 * 
 * Устанавливает переменную окружения DATABASE_PROVIDER=replit
 * и запускает сервер с новыми настройками
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

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
 * Проверяет наличие необходимых переменных окружения
 */
function checkEnvironmentVariables() {
  log('Проверка переменных окружения PostgreSQL...', colors.cyan);
  
  const requiredVars = ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log(`Отсутствуют необходимые переменные окружения: ${missingVars.join(', ')}`, colors.red);
    log('Для создания базы данных PostgreSQL:', colors.yellow);
    log('1. Используйте инструмент create_postgresql_database_tool в чате с ИИ', colors.yellow);
    log('2. Перезапустите терминал после создания базы данных', colors.yellow);
    return false;
  }
  
  log('Все необходимые переменные окружения PostgreSQL найдены', colors.green);
  return true;
}

/**
 * Запускает процесс сервера
 */
function startServer() {
  log('\n=== Запуск сервера с PostgreSQL на Replit ===\n', colors.bright + colors.blue);
  
  if (!checkEnvironmentVariables()) {
    log('Невозможно запустить сервер без корректной конфигурации PostgreSQL', colors.red);
    return;
  }
  
  // Устанавливаем переменную окружения для выбора провайдера
  process.env.DATABASE_PROVIDER = 'replit';
  log('Установлена переменная DATABASE_PROVIDER=replit', colors.green);
  
  // Определяем команду для запуска сервера
  // Проверяем наличие TypeScript
  let serverProcess;
  const serverPath = path.join(__dirname, 'server', 'index.ts');
  
  try {
    // Пытаемся запустить сервер через TypeScript (tsx)
    log('Запуск сервера с использованием tsx...', colors.cyan);
    serverProcess = spawn('npx', ['tsx', serverPath], {
      stdio: 'inherit',
      env: { ...process.env }
    });
  } catch (error) {
    // Если не получилось через tsx, пробуем node
    log('Запуск через tsx не удался, пробуем node...', colors.yellow);
    serverProcess = spawn('node', [serverPath], {
      stdio: 'inherit',
      env: { ...process.env }
    });
  }
  
  // Обработка событий процесса
  serverProcess.on('error', (error) => {
    log(`Ошибка запуска сервера: ${error.message}`, colors.red);
  });
  
  serverProcess.on('close', (code) => {
    if (code !== 0) {
      log(`Сервер завершил работу с кодом: ${code}`, colors.red);
    } else {
      log('Сервер корректно завершил работу', colors.green);
    }
  });
  
  // Обработка сигналов для корректного завершения
  process.on('SIGINT', () => {
    log('\nПолучен сигнал завершения, останавливаем сервер...', colors.yellow);
    serverProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    log('\nПолучен сигнал завершения, останавливаем сервер...', colors.yellow);
    serverProcess.kill('SIGTERM');
  });
}

// Запуск сервера
startServer();