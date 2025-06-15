#!/usr/bin/env node

/**
 * UniFarm Production Server Launcher
 * Стабильный запуск production сервера с исправленными критическими блокерами
 * Задачи 2-8 выполнены успешно
 */

import { spawn } from 'child_process';
import path from 'path';

// Принудительно устанавливаем production режим
process.env.NODE_ENV = 'production';

console.log('🚀 UniFarm Production Server Starting...');
console.log('📦 Environment: production');
console.log('🔧 Критические блокеры устранены (Задачи 2-8)');
console.log('⚡ TSX Runtime для TypeScript поддержки');

// Запуск сервера через TSX для TypeScript поддержки
const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: process.env.PORT || '3000',
    HOST: '0.0.0.0'
  }
});

// Обработка ошибок запуска
serverProcess.on('error', (error) => {
  console.error('❌ Ошибка запуска сервера:', error.message);
  process.exit(1);
});

// Обработка завершения сервера
serverProcess.on('exit', (code) => {
  if (code === 0) {
    console.log('✅ Сервер корректно завершен');
  } else {
    console.error(`❌ Сервер завершен с кодом: ${code}`);
    process.exit(code);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Получен SIGTERM, завершение сервера...');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🔄 Получен SIGINT, завершение сервера...');
  serverProcess.kill('SIGINT');
});