#!/usr/bin/env node

/**
 * Простой запуск Vite dev server для UniFarm
 */

const { spawn } = require('child_process');

console.log('🚀 Запуск Vite dev server...');

const vite = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '3000'], {
  stdio: 'inherit',
  shell: true
});

vite.on('error', (error) => {
  console.error('❌ Ошибка Vite:', error);
  process.exit(1);
});

vite.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Vite завершился с кодом ${code}`);
  }
  process.exit(code || 0);
});

// Обработка завершения
process.on('SIGTERM', () => {
  vite.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  vite.kill();
  process.exit(0);
});