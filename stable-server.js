/**
 * Stable server for UniFarm - Single Integrated Server
 */

import { spawn } from 'child_process';

console.log('🚀 Запуск UniFarm интегрированного сервера...');

// Запускаем интегрированный сервер с TSX
const server = spawn('npx', ['tsx', 'integrated-server.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: process.env.PORT || '3000'
  }
});

server.on('error', (error) => {
  console.error('❌ Ошибка сервера:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`📴 Сервер завершился с кодом ${code}`);
  process.exit(code);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📴 Останавливаю сервер...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n📴 Останавливаю сервер...');
  server.kill('SIGTERM');
});