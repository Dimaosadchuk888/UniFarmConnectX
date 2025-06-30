#!/usr/bin/env node

/**
 * Direct Development Server for UniFarm
 * Запускает сервер с Vite интеграцией напрямую
 */

const { spawn } = require('child_process');

console.log('🚀 Запуск UniFarm сервера в development режиме...\n');

// Устанавливаем переменные окружения
process.env.NODE_ENV = 'development';
process.env.PORT = '3000';
process.env.HOST = '0.0.0.0';
process.env.BYPASS_AUTH = 'true';

// Запускаем tsx server/index.ts напрямую
const server = spawn('tsx', ['server/index.ts'], {
  env: process.env,
  stdio: 'inherit'
});

server.on('error', (error) => {
  console.error('❌ Ошибка запуска сервера:', error.message);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`⚠️ Сервер завершился с кодом ${code}`);
  }
  process.exit(code);
});

// Обработка сигналов завершения
process.on('SIGTERM', () => {
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  server.kill('SIGINT');
});