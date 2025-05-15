/**
 * Файл для деплоя UniFarm (Remix)
 * Обеспечивает корректную работу с Neon DB и партиционированием
 */

import { spawn } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

// Установка переменных окружения для принудительного использования Neon DB
process.env.DATABASE_PROVIDER = 'neon';
process.env.FORCE_NEON_DB = 'true';
process.env.DISABLE_REPLIT_DB = 'true';
process.env.OVERRIDE_DB_PROVIDER = 'neon';
process.env.NODE_ENV = 'production';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Выполняет команду как дочерний процесс
 */
async function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Запуск: ${command} ${args.join(' ')}`);
    
    const childProcess = spawn(command, args, {
      stdio: 'inherit',
      ...options
    });

    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Процесс завершился с кодом: ${code}`));
      }
    });
    
    childProcess.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Главная функция запуска приложения
 */
async function main() {
  console.log('===================================================');
  console.log('  ЗАПУСК UNIFARM В РЕЖИМЕ PRODUCTION (NEON DB)');
  console.log('===================================================');
  console.log('Время запуска:', new Date().toISOString());
  console.log('Настройки базы данных: ПРИНУДИТЕЛЬНО NEON DB');
  console.log('===================================================');
  
  try {
    // В production нам нужно запустить собранное приложение
    const startCommand = 'node server/index.js';
    console.log(`Запуск приложения командой: ${startCommand}`);
    console.log('===================================================');
    
    const [command, ...args] = startCommand.split(' ');
    await runProcess(command, args, {
      env: {
        ...process.env,
        DATABASE_PROVIDER: 'neon',
        FORCE_NEON_DB: 'true',
        DISABLE_REPLIT_DB: 'true',
        OVERRIDE_DB_PROVIDER: 'neon',
        NODE_ENV: 'production'
      }
    });
  } catch (error) {
    console.error('Ошибка при запуске приложения:', error);
    process.exit(1);
  }
}

// Запускаем приложение
main().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
});