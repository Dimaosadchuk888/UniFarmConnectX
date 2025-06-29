#!/usr/bin/env node

/**
 * UniFarm Development Starter
 * Запускает frontend и backend серверы для разработки
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Запуск UniFarm в режиме разработки...');

// Проверяем наличие необходимых файлов
const indexPath = path.join(__dirname, 'dist/public/index.html');
if (!fs.existsSync(indexPath)) {
  console.log('📦 Создание базовой структуры файлов...');
  require('./quick-build.cjs');
}

// Запускаем только backend сервер с обслуживанием статических файлов
console.log('🔧 Запуск сервера...');

const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '3000',
    HOST: '0.0.0.0',
    // Включаем режим разработки с автоматической перезагрузкой
    VITE_API_URL: 'http://localhost:3000'
  },
  stdio: 'inherit',
  shell: true
});

serverProcess.on('error', (error) => {
  console.error('❌ Ошибка запуска сервера:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Сервер завершился с кодом ${code}`);
  }
  process.exit(code || 0);
});

// Обработка завершения
process.on('SIGTERM', () => {
  console.log('\n🛑 Остановка серверов...');
  serverProcess.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Остановка серверов...');
  serverProcess.kill();
  process.exit(0);
});

console.log(`
✅ UniFarm запущен в режиме разработки!

📍 Приложение доступно по адресу: http://localhost:3000
📍 API endpoints: http://localhost:3000/api/v2/
📍 Health check: http://localhost:3000/health

Для остановки нажмите Ctrl+C
`);