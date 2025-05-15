/**
 * Neon Workflow Launcher
 * 
 * Скрипт для запуска UniFarm с принудительным использованием Neon DB
 * Создан специально для использования в workflow
 */

// Устанавливаем переменные окружения для Neon DB до импорта любых модулей
process.env.DATABASE_PROVIDER = 'neon';
process.env.FORCE_NEON_DB = 'true';
process.env.DISABLE_REPLIT_DB = 'true';
process.env.OVERRIDE_DB_PROVIDER = 'neon';
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '3000';

console.log('🚀 Запуск UniFarm с ПРИНУДИТЕЛЬНЫМ использованием Neon DB');
console.log('✅ DATABASE_PROVIDER = neon');
console.log('✅ FORCE_NEON_DB = true');
console.log('✅ NODE_ENV = production');

// Запускаем основное приложение
require('./server/index.js');