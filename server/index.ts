/**
 * Главная точка входа UniFarm
 * Запускает сервер с интеграцией всех модулей
 */

import { startServer } from '../core/server';

// Запуск сервера
startServer()
  .then(() => {
    console.log('✅ UniFarm сервер успешно запущен');
  })
  .catch((error) => {
    console.error('❌ Критическая ошибка запуска сервера:', error);
    process.exit(1);
  });