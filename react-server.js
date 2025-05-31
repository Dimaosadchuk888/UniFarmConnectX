import { spawn } from 'child_process';

const port = process.env.PORT || 3000;

console.log('Запуск React dev сервера...');

// Запуск Vite dev сервера для React компиляции
const viteProcess = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', port.toString()], {
  stdio: 'inherit',
  cwd: process.cwd()
});

viteProcess.on('error', (error) => {
  console.error('Ошибка запуска:', error);
  process.exit(1);
});

viteProcess.on('close', (code) => {
  process.exit(code || 0);
});

process.on('SIGTERM', () => viteProcess.kill('SIGTERM'));
process.on('SIGINT', () => viteProcess.kill('SIGINT'));