/**
 * Скрипт запуска приложения с прямым подключением к Neon DB
 * Обходит все селекторы баз данных и использует только db-neon-direct.ts
 */
require('dotenv').config({ path: '.env.neon' });

console.log('[Launcher] Запуск приложения с принудительным использованием Neon DB');

// Устанавливаем все необходимые переменные окружения
process.env.DATABASE_PROVIDER = 'neon';
process.env.USE_LOCAL_DB_ONLY = 'false';
process.env.FORCE_NEON_DB = 'true';
process.env.DISABLE_REPLIT_DB = 'true';
process.env.OVERRIDE_DB_PROVIDER = 'neon';
process.env.NODE_ENV = 'production';

// Загружаем и запускаем приложение
try {
  console.log('[Launcher] 🚀 Загрузка приложения из dist/index.js');
  require('./dist/index.js');
} catch (error) {
  console.error('[Launcher] ❌ Ошибка при запуске приложения:', error);
  process.exit(1);
}
