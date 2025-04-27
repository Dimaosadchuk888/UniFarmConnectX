/**
 * Production запуск для Replit Deployment
 * Этот файл должен быть указан в настройках деплоя
 */

console.log('🚀 Запуск UniFarm в режиме PRODUCTION...');

// Устанавливаем NODE_ENV=production
process.env.NODE_ENV = 'production';

// Импортируем и запускаем основное приложение
console.log('NODE_ENV=', process.env.NODE_ENV);
console.log('Запуск приложения через production entrypoint...');

// Запускаем приложение
require('./dist/index.js');