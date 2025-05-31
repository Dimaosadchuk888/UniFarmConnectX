/**
 * Запуск сервера для тестирования кабинета с реальными данными
 */

import { spawn } from 'child_process';

console.log('🚀 Запуск сервера разработки для тестирования кабинета...');

const server = spawn('tsx', ['server/index.ts'], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: '3000',
    DATABASE_PROVIDER: 'neon',
    FORCE_NEON_DB: 'true'
  },
  stdio: 'inherit'
});

server.on('error', (err) => {
  console.error('Ошибка запуска сервера:', err);
});

server.on('exit', (code) => {
  console.log(`Сервер завершил работу с кодом ${code}`);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Остановка сервера...');
  server.kill('SIGINT');
  process.exit(0);
});