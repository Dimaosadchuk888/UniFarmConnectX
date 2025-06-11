const { spawn } = require('child_process');

console.log('🚀 Запуск UniFarm сервера...');

const server = spawn('node', ['stable-server.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '3000'
  }
});

server.on('close', (code) => {
  console.log(`Сервер завершен с кодом ${code}`);
});

server.on('error', (err) => {
  console.error('Ошибка запуска сервера:', err);
});