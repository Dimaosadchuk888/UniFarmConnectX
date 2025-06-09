/**
 * Stable server for UniFarm - запускает backend через CommonJS
 */

const { spawn } = require('child_process');

console.log('Запуск UniFarm сервера...');

// Запускаем CommonJS сервер
const server = spawn('node', ['stable-server.cjs'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: process.env.PORT || '3000'
  }
});

server.on('error', (error) => {
  console.error('Ошибка сервера:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Сервер завершился с кодом ${code}`);
  process.exit(code);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nОстанавливаю сервер...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\nОстанавливаю сервер...');
  server.kill('SIGTERM');
});