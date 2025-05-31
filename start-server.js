/**
 * Запуск сервера UniFarm после очистки
 */

import { spawn } from 'child_process';

console.log('🚀 Запуск сервера UniFarm...');
console.log('📊 Проверяем работоспособность после очистки\n');

// Запускаем сервер
const server = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '3000'
  }
});

server.on('error', (error) => {
  console.error('❌ Ошибка запуска сервера:', error);
});

server.on('exit', (code) => {
  console.log(`\n📈 Сервер завершил работу с кодом: ${code}`);
});

// Обработка остановки процесса
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка сервера...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Принудительная остановка сервера...');
  server.kill('SIGTERM');
});