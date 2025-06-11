#!/usr/bin/env node

/**
 * Стартовый скрипт для UniFarm с интеграцией обновленного дизайна из папки client
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Запуск UniFarm с обновленным дизайном из папки client...');

// Переменные окружения для корректной работы
const env = {
  ...process.env,
  NODE_ENV: 'development',
  PORT: '3001',
  FORCE_COLOR: '1'
};

// Запуск сервера с интеграцией Vite и папки client
const serverProcess = spawn('tsx', ['server/index.ts'], {
  cwd: __dirname,
  env,
  stdio: 'inherit'
});

// Обработка сигналов завершения
process.on('SIGINT', () => {
  console.log('\n🛑 Получен сигнал остановки...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Получен сигнал завершения...');
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

serverProcess.on('close', (code) => {
  console.log(`\n📡 Сервер завершен с кодом ${code}`);
  process.exit(code);
});

serverProcess.on('error', (error) => {
  console.error('❌ Ошибка запуска сервера:', error);
  process.exit(1);
});