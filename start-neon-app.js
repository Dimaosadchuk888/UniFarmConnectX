/**
 * Скрипт для запуска приложения с принудительным использованием Neon DB
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { createInterface } from 'readline';

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

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

let appProcess = null;

// Функция для запуска приложения
function startApp() {
  return new Promise((resolve, reject) => {
    log('🚀 Запуск приложения с принудительным использованием Neon DB...', colors.magenta);
    
    // Загружаем переменные окружения из файла .env.neon
    const envConfig = {};
    try {
      const envFile = readFileSync('.env.neon', 'utf8');
      envFile.split('\n').forEach(line => {
        // Игнорируем комментарии и пустые строки
        if (line.trim() && !line.startsWith('#')) {
          const [key, value] = line.split('=').map(part => part.trim());
          envConfig[key] = value;
        }
      });
      
      log('✅ Загружены настройки из .env.neon:', colors.green);
      Object.keys(envConfig).forEach(key => {
        if (key === 'DATABASE_URL') {
          log(`  ${key}=${envConfig[key].replace(/:[^:]*@/, ':***@')}`, colors.reset);
        } else {
          log(`  ${key}=${envConfig[key]}`, colors.reset);
        }
      });
    } catch (err) {
      log(`⚠️ Ошибка при загрузке .env.neon: ${err.message}`, colors.yellow);
      log('Используем значения по умолчанию', colors.yellow);
    }
    
    // Устанавливаем переменные окружения
    const env = { 
      ...process.env,
      ...envConfig,
      NODE_ENV: 'production' 
    };
    
    // Запускаем приложение с настройками для Neon DB
    appProcess = spawn('node', ['dist/index.js'], { 
      env, 
      stdio: 'pipe',
      env: {
        ...env,
        DATABASE_PROVIDER: 'neon',
        USE_LOCAL_DB_ONLY: 'false',
        FORCE_NEON_DB: 'true',
        DISABLE_REPLIT_DB: 'true',
        OVERRIDE_DB_PROVIDER: 'neon',
        DISABLE_AUTO_PARTITIONING: 'true',
      }
    });
    
    // Обработка вывода
    appProcess.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(output);
      
      // Проверяем запуск сервера
      if (output.includes('Server is listening') || 
          output.includes('serving on port') ||
          output.includes('All cron jobs initialized')) {
        resolve(true);
      }
    });
    
    // Обработка ошибок
    appProcess.stderr.on('data', (data) => {
      const output = data.toString();
      process.stderr.write(`${colors.red}${output}${colors.reset}`);
      
      // Проверяем критические ошибки
      if (output.includes('FATAL ERROR') || output.includes('Uncaught Exception')) {
        reject(new Error('Fatal error in server'));
      }
    });
    
    // Обработка завершения процесса
    appProcess.on('close', (code) => {
      if (code !== 0 && code !== null) {
        log(`\n❌ Приложение завершилось с кодом ${code}`, colors.red);
        reject(new Error(`Process exited with code ${code}`));
      } else {
        log('\nПриложение завершило работу', colors.yellow);
        resolve(false);
      }
    });
    
    // Таймаут на случай, если приложение запускается долго
    setTimeout(() => {
      log('\n⏳ Приложение запускается дольше обычного, но процесс продолжается...', colors.yellow);
      resolve(true);
    }, 15000);
  });
}

// Функция для чистой остановки и выхода
function cleanupAndExit() {
  log('\nОстановка приложения...', colors.yellow);
  
  if (appProcess && !appProcess.killed) {
    appProcess.kill();
    appProcess = null;
  }
  
  log('Выход из скрипта', colors.yellow);
  process.exit(0);
}

// Обработка сигналов завершения
process.on('SIGINT', cleanupAndExit);
process.on('SIGTERM', cleanupAndExit);

// Главная функция
async function main() {
  try {
    // Запускаем приложение
    const serverStarted = await startApp();
    
    if (serverStarted) {
      log('\n✅ Приложение успешно запущено с Neon DB', colors.green);
      log('Для проверки API и веб-интерфейса откройте URL: http://localhost:3000', colors.magenta);
      
      // Создаем интерфейс readline для обработки команд пользователя
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'UniFarm> '
      });
      
      log('\n📋 Доступные команды:', colors.magenta);
      log('  exit - завершить работу', colors.reset);
      
      rl.prompt();
      
      rl.on('line', (line) => {
        const command = line.trim();
        
        if (command === 'exit' || command === 'quit') {
          rl.close();
          cleanupAndExit();
        } else {
          log(`Неизвестная команда: ${command}`, colors.yellow);
          log('Доступные команды: exit', colors.yellow);
        }
        
        rl.prompt();
      });
      
      rl.on('close', () => {
        cleanupAndExit();
      });
    } else {
      log('❌ Не удалось запустить приложение', colors.red);
      process.exit(1);
    }
  } catch (err) {
    log(`❌ Критическая ошибка: ${err.message}`, colors.red);
    process.exit(1);
  }
}

// Запускаем главную функцию
main().catch(err => {
  log(`Непредвиденная ошибка: ${err.message}`, colors.red);
  process.exit(1);
});