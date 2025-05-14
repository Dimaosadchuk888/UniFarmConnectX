const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Скрипт для запуска UniFarm с использованием локальной базы данных PostgreSQL
 * 
 * Последовательно выполняет:
 * 1. Запуск PostgreSQL и ожидание его готовности
 * 2. Проверка соединения с базой данных
 * 3. Запуск приложения UniFarm
 */

// Цвета для логов
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Переменные для хранения дочерних процессов
let postgresProcess = null;
let appProcess = null;

// Объединённые переменные окружения
const combinedEnv = {
  ...process.env,
  // Принудительно используем только локальную базу данных
  DATABASE_PROVIDER: 'replit',
  USE_LOCAL_DB_ONLY: 'true',
};

// Создаем директорию для логов, если она не существует
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Создаем потоки для записи логов
const postgresLogStream = fs.createWriteStream(path.join(logsDir, 'postgres.log'), { flags: 'a' });
const appLogStream = fs.createWriteStream(path.join(logsDir, 'app.log'), { flags: 'a' });

// Функция для логирования с меткой времени
function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

// Функция для запуска PostgreSQL и ожидания его готовности
function startPostgres() {
  return new Promise((resolve, reject) => {
    log('Запуск PostgreSQL...', colors.cyan);
    
    // Запускаем скрипт для установки и запуска PostgreSQL
    postgresProcess = spawn('bash', ['./start-postgres.sh']);
    
    // Устанавливаем обработчики событий
    postgresProcess.stdout.on('data', (data) => {
      const output = data.toString();
      postgresLogStream.write(`[STDOUT] ${output}`);
      process.stdout.write(`${colors.gray}[PostgreSQL] ${output}${colors.reset}`);
      
      // Проверяем, готова ли база данных
      if (output.includes('PostgreSQL готов к работе') || 
          output.includes('PostgreSQL уже запущен')) {
        log('PostgreSQL успешно запущен', colors.green);
        resolve();
      }
    });
    
    postgresProcess.stderr.on('data', (data) => {
      const output = data.toString();
      postgresLogStream.write(`[STDERR] ${output}`);
      process.stderr.write(`${colors.red}[PostgreSQL ERROR] ${output}${colors.reset}`);
    });
    
    postgresProcess.on('close', (code) => {
      if (code !== 0) {
        const errorMsg = `PostgreSQL завершил работу с кодом ${code}`;
        log(errorMsg, colors.red);
        reject(new Error(errorMsg));
      }
    });
    
    // Устанавливаем таймаут на случай, если PostgreSQL не запустится
    setTimeout(() => {
      log('Истекло время ожидания запуска PostgreSQL. Пробуем продолжить...', colors.yellow);
      resolve();
    }, 15000);
  });
}

// Функция для проверки соединения с базой данных
function checkDatabaseConnection() {
  return new Promise((resolve, reject) => {
    log('Проверка соединения с базой данных...', colors.cyan);
    
    // Выполняем скрипт для проверки подключения
    exec('node check-replit-db.js', { env: combinedEnv }, (error, stdout, stderr) => {
      if (error) {
        log(`Ошибка при проверке соединения: ${error.message}`, colors.red);
        log('Пробуем продолжить несмотря на ошибку...', colors.yellow);
        resolve(); // Продолжаем несмотря на ошибку
        return;
      }
      
      if (stderr) {
        log(`Предупреждение при проверке соединения: ${stderr}`, colors.yellow);
      }
      
      if (stdout.includes('Соединение успешно установлено')) {
        log('Соединение с базой данных успешно установлено', colors.green);
      } else {
        log('Не удалось подтвердить соединение с базой данных. Пробуем продолжить...', colors.yellow);
      }
      
      resolve();
    });
  });
}

// Функция для запуска приложения UniFarm
function startApp() {
  return new Promise((resolve, reject) => {
    log('Запуск приложения UniFarm...', colors.cyan);
    
    // Запускаем сервер с настроенными переменными окружения
    appProcess = spawn('node', ['server/index.js'], { env: combinedEnv });
    
    // Создаем интерфейс readline для обработки ввода
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Обработчик для ввода команд во время работы
    rl.on('line', (line) => {
      const command = line.trim();
      
      if (command === 'restart') {
        log('Перезапуск приложения...', colors.yellow);
        stopApp().then(() => startApp());
      } else if (command === 'exit' || command === 'quit') {
        log('Завершение работы...', colors.yellow);
        cleanupAndExit();
      } else {
        log(`Доступные команды: restart, exit`, colors.gray);
      }
    });
    
    // Устанавливаем обработчики событий
    appProcess.stdout.on('data', (data) => {
      const output = data.toString();
      appLogStream.write(`[STDOUT] ${output}`);
      process.stdout.write(output);
      
      // Проверяем, запущен ли сервер успешно
      if (output.includes('Server is listening') || 
          output.includes('Server running on port')) {
        log('Приложение UniFarm успешно запущено', colors.green);
      }
    });
    
    appProcess.stderr.on('data', (data) => {
      const output = data.toString();
      appLogStream.write(`[STDERR] ${output}`);
      process.stderr.write(`${colors.red}${output}${colors.reset}`);
    });
    
    appProcess.on('close', (code) => {
      if (code !== 0 && code !== null) {
        const errorMsg = `Приложение UniFarm завершило работу с кодом ${code}`;
        log(errorMsg, colors.red);
        reject(new Error(errorMsg));
      } else {
        log('Приложение UniFarm завершило работу', colors.yellow);
        resolve();
      }
    });
  });
}

// Функция для остановки приложения
function stopApp() {
  return new Promise((resolve) => {
    if (appProcess && !appProcess.killed) {
      log('Останавливаем приложение...', colors.yellow);
      appProcess.kill();
      appProcess = null;
    }
    resolve();
  });
}

// Функция для очистки ресурсов и завершения работы
function cleanupAndExit() {
  log('Завершение работы всех процессов...', colors.yellow);
  
  // Останавливаем приложение
  if (appProcess && !appProcess.killed) {
    appProcess.kill();
  }
  
  // Останавливаем PostgreSQL
  if (postgresProcess && !postgresProcess.killed) {
    postgresProcess.kill();
  }
  
  // Закрываем потоки для записи логов
  postgresLogStream.end();
  appLogStream.end();
  
  log('Все процессы завершены. Выход...', colors.yellow);
  process.exit(0);
}

// Обработка сигналов завершения
process.on('SIGINT', cleanupAndExit);
process.on('SIGTERM', cleanupAndExit);

// Главная функция запуска
async function main() {
  log('Запуск унифицированного окружения UniFarm с Replit PostgreSQL', colors.magenta);
  
  try {
    // Шаг 1: Запуск PostgreSQL
    await startPostgres();
    
    // Шаг 2: Проверка соединения с базой данных
    await checkDatabaseConnection();
    
    // Шаг 3: Запуск приложения
    await startApp();
  } catch (error) {
    log(`Критическая ошибка: ${error.message}`, colors.red);
    cleanupAndExit();
  }
}

// Запускаем основную функцию
main();