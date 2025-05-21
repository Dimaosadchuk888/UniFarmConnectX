/**
 * Основной скрипт запуска для Replit
 * 
 * Этот файл используется как точка входа для запуска сервера UniFarm
 * через функцию "Run" в Replit.
 */

// Включаем strict mode для лучшей обработки ошибок
'use strict';

// Импортируем необходимые модули
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Настройки приложения
const APP_NAME = 'UniFarm';
const APP_PORT = 3000;

// Сохраняем время запуска для расчета uptime
const startTime = Date.now();

// Обновленная информация о запуске
console.log(`🚀 Запуск ${APP_NAME} сервера в режиме long-running process`);
console.log(`📅 Дата запуска: ${new Date().toISOString()}`);

// Сохраняем дескриптор для процесса сервера
let serverProcess = null;

// Функция для запуска сервера
function startServer() {
  console.log('⚙️ Инициализация сервера...');
  
  // Используем npx tsx для запуска TypeScript файла без необходимости компиляции
  serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit', // Перенаправляем ввод/вывод в родительский процесс
    env: {
      ...process.env,
      NODE_ENV: 'production', // Устанавливаем режим production
    }
  });
  
  // Обрабатываем закрытие процесса сервера
  serverProcess.on('close', (code) => {
    console.log(`⚠️ Сервер остановлен с кодом ${code}`);
    console.log('🔄 Перезапуск через 3 секунды...');
    
    // Автоматически перезапускаем сервер в случае закрытия
    setTimeout(startServer, 3000);
  });
  
  // Обрабатываем ошибки процесса сервера
  serverProcess.on('error', (err) => {
    console.error(`❌ Ошибка запуска сервера: ${err.message}`);
    console.log('🔄 Перезапуск через 5 секунд...');
    
    // Перезапускаем в случае ошибки с небольшой задержкой
    setTimeout(startServer, 5000);
  });
}

// Запускаем сервер
startServer();

// Обрабатываем сигналы завершения
process.on('SIGINT', () => {
  console.log('⚠️ Получен сигнал SIGINT');
  console.log('✋ Игнорируем для поддержания работы в Replit');
});

process.on('SIGTERM', () => {
  console.log('⚠️ Получен сигнал SIGTERM');
  console.log('✋ Игнорируем для поддержания работы в Replit');
});

// Обрабатываем необработанные исключения
process.on('uncaughtException', (err) => {
  console.error('❌ Необработанное исключение:', err);
  console.log('✅ Продолжаем работу основного процесса');
});

// Интервал для поддержания процесса активным
setInterval(() => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;
  
  console.log(`⏱️ Время работы: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
}, 15 * 60 * 1000); // Каждые 15 минут

// Короткий интервал для гарантии того, что процесс не завершится
setInterval(() => {}, 1000);

console.log('✅ Процесс поддержания сервера инициализирован успешно!');