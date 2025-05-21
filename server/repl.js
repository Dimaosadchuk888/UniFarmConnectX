/**
 * Модуль для конфигурации запуска в Replit
 * 
 * Этот файл запускается Replit, когда пользователь нажимает кнопку "Run"
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Определяем текущую директорию
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Выводим информацию о запуске
console.log('🚀 UniFarm Server - Запуск через Replit...');
console.log('⏱️ Время запуска:', new Date().toISOString());

// Запускаем наш скрипт поддержания сервера
const serverProcess = spawn('node', ['start.cjs'], {
  cwd: rootDir,
  stdio: 'inherit', 
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

// Обрабатываем завершение дочернего процесса
serverProcess.on('close', (code) => {
  console.log(`⚠️ Процесс завершился с кодом ${code}`);
  
  // Не завершаем основной процесс, чтобы Replit не перезапускал сервер
  setInterval(() => {}, 1000);
});

// Держим основной процесс активным
setInterval(() => {}, 1000);