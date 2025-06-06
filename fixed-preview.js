#!/usr/bin/env node
/**
 * Исправленный preview сервер для UniFarm
 * Запускает API сервер и Vite клиент одновременно
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Запуск исправленного UniFarm сервера...');

// Запускаем API сервер на порту 3001
const apiServer = spawn('node', ['simple-api-server.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: '3001' }
});

// Запускаем Vite клиент на порту 3000
const viteServer = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '3000'], {
  cwd: path.join(__dirname, 'client'),
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: '1' }
});

// Обработка ошибок
apiServer.on('error', (err) => {
  console.error('❌ Ошибка API сервера:', err.message);
});

viteServer.on('error', (err) => {
  console.error('❌ Ошибка Vite сервера:', err.message);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка серверов...');
  apiServer.kill();
  viteServer.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  apiServer.kill();
  viteServer.kill();
  process.exit(0);
});

console.log('✅ Серверы запущены:');
console.log('📡 API сервер: http://localhost:3001');
console.log('🌐 Vite клиент: http://localhost:3000');