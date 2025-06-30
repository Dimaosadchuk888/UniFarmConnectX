#!/usr/bin/env node

/**
 * Простой запуск UniFarm в режиме разработки
 */

const { exec } = require('child_process');

console.log('🚀 Запуск UniFarm...\n');

// Устанавливаем переменные окружения
process.env.NODE_ENV = 'development';
process.env.PORT = '3000';
process.env.HOST = '0.0.0.0';
process.env.BYPASS_AUTH = 'true';

// Запускаем сервер
const server = exec('tsx server/index.ts', {
  env: process.env
});

// Логирование вывода
server.stdout.on('data', (data) => {
  process.stdout.write(data);
});

server.stderr.on('data', (data) => {
  process.stderr.write(data);
});

server.on('exit', (code) => {
  console.log(`Сервер завершился с кодом ${code}`);
  process.exit(code);
});