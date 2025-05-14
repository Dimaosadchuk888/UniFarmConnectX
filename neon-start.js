#!/usr/bin/env node
/**
 * Скрипт для запуска приложения с принудительным использованием Neon DB
 * 
 * Этот скрипт загружает переменные окружения из файла .env.neon и 
 * запускает приложение с правильными настройками для соединения с Neon DB.
 */

import { exec } from 'child_process';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
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

// Логирование с цветами
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Основные настройки
const CONFIG = {
  NEON_ENV_FILE: '.env.neon',
  NEON_IMPORT_FILE: 'server/db-neon-direct.ts',
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'production'
};

// Проверка наличия файлов
function checkFiles() {
  log('🔍 Проверка наличия необходимых файлов...', colors.blue);
  
  const neonEnvExists = existsSync(CONFIG.NEON_ENV_FILE);
  const neonImportExists = existsSync(CONFIG.NEON_IMPORT_FILE);
  
  if (!neonEnvExists) {
    log(`❌ Файл ${CONFIG.NEON_ENV_FILE} не найден. Создаю файл со стандартными настройками...`, colors.yellow);
    
    const defaultNeonEnv = `# Настройки принудительного использования Neon DB
DATABASE_PROVIDER=neon
USE_LOCAL_DB_ONLY=false
FORCE_NEON_DB=true
DISABLE_REPLIT_DB=true
OVERRIDE_DB_PROVIDER=neon
DISABLE_AUTO_PARTITIONING=true

# URL подключения к Neon DB (замените на ваш)
DATABASE_URL=postgresql://neondb_owner:npg_PASSWORD@ep-your-db-name.us-east-1.aws.neon.tech/neondb?sslmode=require
`;
    
    writeFileSync(CONFIG.NEON_ENV_FILE, defaultNeonEnv);
    log(`✅ Файл ${CONFIG.NEON_ENV_FILE} создан. Пожалуйста, отредактируйте его и укажите правильный DATABASE_URL.`, colors.green);
    return false;
  }
  
  if (!neonImportExists) {
    log(`❌ Файл ${CONFIG.NEON_IMPORT_FILE} не найден. Необходимо создать его для прямого подключения к Neon DB.`, colors.red);
    return false;
  }
  
  log('✅ Все необходимые файлы найдены', colors.green);
  return true;
}

// Загрузка переменных окружения из .env.neon
function loadNeonEnv() {
  log('📝 Загрузка настроек из .env.neon...', colors.blue);
  
  try {
    const envContent = readFileSync(CONFIG.NEON_ENV_FILE, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      // Игнорируем комментарии и пустые строки
      if (line.trim() && !line.startsWith('#')) {
        const [key, value] = line.split('=').map(part => part.trim());
        
        if (key && value) {
          envVars[key] = value;
          
          // Устанавливаем переменную окружения
          process.env[key] = value;
        }
      }
    });
    
    // Проверка наличия DATABASE_URL
    if (!envVars.DATABASE_URL) {
      log('⚠️ Отсутствует DATABASE_URL в .env.neon. Убедитесь, что вы указали правильный URL подключения к Neon DB.', colors.yellow);
      return false;
    }
    
    // Добавляем принудительные настройки, если они отсутствуют
    if (!envVars.FORCE_NEON_DB) process.env.FORCE_NEON_DB = 'true';
    if (!envVars.DISABLE_REPLIT_DB) process.env.DISABLE_REPLIT_DB = 'true';
    if (!envVars.OVERRIDE_DB_PROVIDER) process.env.OVERRIDE_DB_PROVIDER = 'neon';
    
    // Выводим маскированную информацию
    log('🔐 Настройки загружены:', colors.green);
    Object.keys(envVars).forEach(key => {
      const value = key === 'DATABASE_URL' 
        ? envVars[key].replace(/:[^:]*@/, ':***@')
        : envVars[key];
      
      log(`  ${key}=${value}`, colors.reset);
    });
    
    return true;
  } catch (err) {
    log(`❌ Ошибка при загрузке .env.neon: ${err.message}`, colors.red);
    return false;
  }
}

// Запуск приложения
function startApp() {
  log('\n🚀 Запуск приложения с настройками Neon DB...', colors.magenta);
  
  // Создаем команду с правильными переменными окружения
  const startCommand = `NODE_ENV=${CONFIG.NODE_ENV} PORT=${CONFIG.PORT} node dist/index.js`;
  
  // Запускаем приложение
  const child = exec(startCommand);
  
  // Обработка вывода
  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  // Обработка завершения
  child.on('exit', (code, signal) => {
    if (code !== 0) {
      log(`\n❌ Приложение завершилось с кодом ${code}`, colors.red);
    } else {
      log('\n✅ Приложение завершило работу', colors.green);
    }
  });
  
  // Обработка прерывания
  process.on('SIGINT', () => {
    log('\n🛑 Получен сигнал прерывания (Ctrl+C)', colors.yellow);
    child.kill('SIGINT');
  });
  
  return child;
}

// Главная функция
async function main() {
  log('🌟 Запуск UniFarm с Neon DB', colors.magenta);
  
  // Проверка файлов
  if (!checkFiles()) {
    log('\n❌ Невозможно продолжить из-за отсутствия необходимых файлов', colors.red);
    process.exit(1);
  }
  
  // Загрузка переменных окружения
  if (!loadNeonEnv()) {
    log('\n⚠️ Проблемы с настройками. Убедитесь, что .env.neon содержит правильные значения.', colors.yellow);
    
    // Спрашиваем, продолжать ли
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('Продолжить запуск, несмотря на проблемы с настройками? (y/n): ', resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() !== 'y') {
      log('Запуск отменен.', colors.yellow);
      process.exit(1);
    }
  }
  
  // Запускаем приложение
  const appProcess = startApp();
  
  // Выводим сообщение о том, как остановить приложение
  log('\n👉 Для остановки приложения нажмите Ctrl+C', colors.cyan);
}

// Запускаем основную функцию
main().catch(err => {
  log(`\n❌ Непредвиденная ошибка: ${err.message}`, colors.red);
  process.exit(1);
});