import express from 'express';
import { spawn } from 'child_process';

const app = express();
const port = process.env.PORT || 3000;

console.log('🚀 Запуск Vite dev сервера для React...');

// Запуск Vite в dev режиме
const viteProcess = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', port.toString()], {
  stdio: 'inherit',
  cwd: process.cwd()
});

viteProcess.on('error', (error) => {
  console.error('❌ Ошибка запуска Vite:', error);
  process.exit(1);
});

viteProcess.on('close', (code) => {
  console.log(`Vite завершился с кодом ${code}`);
  process.exit(code || 0);
});

// Обработка сигналов завершения
process.on('SIGTERM', () => {
  viteProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  viteProcess.kill('SIGINT');
});