/**
 * Скрипт для непрерывного запуска сервера UniFarm в среде Replit
 * Этот скрипт запускает сервер и поддерживает его работу,
 * предотвращая автоматическое завершение процесса
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('⚙️ Запуск сервера UniFarm...');
console.log('🕙 Время запуска:', new Date().toISOString());

// Записываем время начала работы
const startTime = new Date();

// Используем переменные окружения
const NODE_ENV = process.env.NODE_ENV || 'production';
console.log(`🌐 Режим окружения: ${NODE_ENV}`);

// Команда для запуска сервера через tsx (TypeScript Execute)
const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit', // Перенаправляем ввод/вывод в родительский процесс
  env: {
    ...process.env,
    NODE_ENV
  }
});

// Обработка завершения процесса сервера
serverProcess.on('close', (code) => {
  const uptime = Math.floor((new Date() - startTime) / 1000);
  console.log(`⚠️ Сервер завершил работу с кодом ${code}`);
  console.log(`⏱️ Время работы: ${Math.floor(uptime / 60)}м ${uptime % 60}с`);
  
  // Не выходим из процесса при аварийном завершении сервера
  console.log('🔄 Сервер завершился, но скрипт продолжает работу...');
});

// Обработка ошибок дочернего процесса
serverProcess.on('error', (err) => {
  console.error(`❌ Ошибка запуска сервера: ${err}`);
});

// Создаем "бесконечную" задачу, которая не дает процессу завершиться
// Это ключевой момент - Node.js не завершит процесс, пока есть активные таймеры или интервалы
const keepAliveInterval = setInterval(() => {
  const uptime = Math.floor((new Date() - startTime) / 1000);
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  
  // Каждые 5 минут выводим информацию о работе
  if (uptime % 300 === 0 && uptime > 0) {
    console.log(`🟢 [KeepAlive] Сервер работает ${hours}ч ${minutes}м ${seconds}с`);
  }
}, 1000);

// Обрабатываем сигналы завершения
process.on('SIGINT', () => {
  console.log('⛔ Получен сигнал SIGINT, завершаем работу...');
  clearInterval(keepAliveInterval);
  serverProcess.kill();
  process.exit(0);
});

// Обрабатываем необработанные исключения
process.on('uncaughtException', (err) => {
  console.error('❌ Необработанное исключение:', err);
  // Не завершаем процесс
});

console.log('✅ Скрипт запуска инициализирован успешно!');
console.log('⏳ Ожидание запуска сервера...');