/**
 * Production Deployment для Replit
 * Этот файл используется для запуска приложения в режиме production через Replit Deploy
 */

console.log('🚀 Запуск production deployment для UniFarm...');

// Устанавливаем NODE_ENV=production
process.env.NODE_ENV = 'production';

console.log('NODE_ENV установлен в:', process.env.NODE_ENV);
console.log('Запуск сервера из скомпилированных файлов (dist/index.js)...');

try {
  // Загружаем и запускаем скомпилированный сервер
  require('./dist/index.js');
  console.log('✅ Сервер успешно запущен в production режиме');
} catch (error) {
  console.error('❌ Ошибка при запуске сервера:', error);
  process.exit(1);
}