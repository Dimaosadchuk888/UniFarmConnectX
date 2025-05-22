/**
 * Оптимізований скрипт для роботи UniFarm як Telegram Mini App
 * - Повністю ігнорує помилки БД
 * - Використовує тільки in-memory storage
 * - Не завершується при помилках
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// Налаштування
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT || '3000';

// Змінні середовища для роботи без БД
process.env.FORCE_MEMORY_STORAGE = 'true';
process.env.DATABASE_PROVIDER = 'memory';
process.env.ALLOW_MEMORY_FALLBACK = 'true';
process.env.USE_MEMORY_SESSION = 'true';
process.env.IGNORE_DB_CONNECTION_ERRORS = 'true';
process.env.BYPASS_DB_CHECK = 'true';
process.env.SKIP_PARTITION_CREATION = 'true';
process.env.IGNORE_PARTITION_ERRORS = 'true';
process.env.SKIP_MIGRATIONS = 'true';
process.env.SKIP_TELEGRAM_CHECK = 'true';
process.env.ALLOW_BROWSER_ACCESS = 'true';
process.env.NODE_ENV = 'production';

// Функція для конфігурації відмовостійкості
function configureInMemoryFallback() {
  // Використовуємо синхронний API для більшої надійності
  try {
    // Перевіряємо наявність .env
    if (fs.existsSync('.env')) {
      console.log('Застосовую налаштування з .env файлу');
      
      // Читаємо .env файл і шукаємо налаштування для fallback
      const envContent = fs.readFileSync('.env', 'utf8');
      const lines = envContent.split('\n');
      
      // Перезаписуємо налаштування для примусового використання memory storage
      let updatedContent = '';
      let memorySettingsUpdated = false;
      
      for (const line of lines) {
        let newLine = line;
        
        if (line.startsWith('FORCE_MEMORY_STORAGE=') || 
            line.startsWith('ALLOW_MEMORY_FALLBACK=') || 
            line.startsWith('USE_MEMORY_SESSION=') || 
            line.startsWith('DATABASE_PROVIDER=')) {
          memorySettingsUpdated = true;
        }
        
        updatedContent += newLine + '\n';
      }
      
      // Якщо налаштування не знайдені, додаємо їх
      if (!memorySettingsUpdated) {
        updatedContent += '\n# Memory fallback settings\n';
        updatedContent += 'FORCE_MEMORY_STORAGE=true\n';
        updatedContent += 'ALLOW_MEMORY_FALLBACK=true\n';
        updatedContent += 'USE_MEMORY_SESSION=true\n';
        updatedContent += 'DATABASE_PROVIDER=memory\n';
        updatedContent += 'IGNORE_DB_CONNECTION_ERRORS=true\n';
        updatedContent += 'SKIP_PARTITION_CREATION=true\n';
        updatedContent += 'IGNORE_PARTITION_ERRORS=true\n';
        
        // Зберігаємо оновлений файл
        fs.writeFileSync('.env', updatedContent, 'utf8');
        console.log('Оновлено .env для роботи з memory storage');
      }
    }
  } catch (error) {
    console.error('Помилка конфігурації fallback:', error.message);
    // Продовжуємо роботу навіть при помилці конфігурації
  }
}

// Запускаємо сервер як дочірній процес
function startServer() {
  console.log('==============================================');
  console.log('  UNIFARM TELEGRAM MINI APP SERVER');
  console.log('==============================================');
  console.log('Час запуску:', new Date().toISOString());
  console.log('Режим: In-Memory Storage');
  console.log('Порт:', PORT);
  console.log('==============================================');

  // Знаходимо файл для запуску
  let serverFile = './dist/index.js';
  let command = 'node';
  let args = ['dist/index.js'];
  
  if (fs.existsSync('./server/index.ts')) {
    serverFile = './server/index.ts';
    command = 'npx';
    args = ['tsx', 'server/index.ts'];
  } else if (!fs.existsSync('./dist/index.js') && fs.existsSync('./index.js')) {
    serverFile = './index.js';
    command = 'node';
    args = ['index.js'];
  }
  
  console.log(`Запуск файлу: ${serverFile}`);
  
  // Підготовка середовища з примусовим memory storage
  const env = {
    ...process.env,
    FORCE_MEMORY_STORAGE: 'true',
    DATABASE_PROVIDER: 'memory',
    ALLOW_MEMORY_FALLBACK: 'true',
    USE_MEMORY_SESSION: 'true',
    IGNORE_DB_CONNECTION_ERRORS: 'true',
    BYPASS_DB_CHECK: 'true',
    SKIP_PARTITION_CREATION: 'true',
    IGNORE_PARTITION_ERRORS: 'true',
    SKIP_MIGRATIONS: 'true',
    SKIP_TELEGRAM_CHECK: 'true',
    ALLOW_BROWSER_ACCESS: 'true',
  };
  
  // Запускаємо сервер з повним ігноруванням помилок БД
  const server = spawn(command, args, {
    env,
    stdio: 'inherit'
  });
  
  // Обробка завершення
  server.on('exit', (code) => {
    console.log(`Сервер завершив роботу з кодом ${code || 0}`);
    console.log('Перезапуск через 3 секунди...');
    
    setTimeout(() => {
      console.log('Перезапуск сервера...');
      startServer();
    }, 3000);
  });
  
  // Обробка помилок
  server.on('error', (error) => {
    console.error('Помилка запуску сервера:', error.message);
    console.log('Перезапуск через 3 секунди...');
    
    setTimeout(() => {
      console.log('Перезапуск сервера...');
      startServer();
    }, 3000);
  });
  
  // Інтервал для підтримки активності процесу
  setInterval(() => {
    console.log(`[KeepAlive] Сервер активний (${new Date().toISOString()})`);
  }, 30000);
}

// Глобальні обробники помилок
process.on('uncaughtException', (error) => {
  console.error('[SYSTEM] Необроблена помилка:', error.message);
  // Продовжуємо роботу
});

process.on('unhandledRejection', (reason) => {
  console.error('[SYSTEM] Необроблене відхилення Promise:', reason);
  // Продовжуємо роботу
});

// Запускаємо конфігурацію та сервер
configureInMemoryFallback();
startServer();