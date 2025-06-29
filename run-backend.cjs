#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('🔧 Запуск backend сервера на порту 3001...');

const backend = spawn('npx', ['tsx', 'server/index.ts'], {
  env: {
    ...process.env,
    PORT: '3001',
    NODE_ENV: 'development',
    HOST: '0.0.0.0'
  },
  stdio: 'inherit',
  shell: true
});

backend.on('error', (error) => {
  console.error('❌ Ошибка backend:', error);
  process.exit(1);
});

backend.on('exit', (code) => {
  console.log(`Backend завершился с кодом ${code}`);
  process.exit(code || 0);
});

process.on('SIGTERM', () => {
  backend.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  backend.kill();
  process.exit(0);
});