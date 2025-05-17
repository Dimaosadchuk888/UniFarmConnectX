// Основной файл запуска для деплоя
// Запускает приложение с отключенной проверкой Telegram

// Устанавливаем переменные окружения для правильной работы
process.env.NODE_ENV = 'production';
process.env.FORCE_NEON_DB = 'true';
process.env.OVERRIDE_DB_PROVIDER = 'neon';
process.env.DATABASE_PROVIDER = 'neon';
process.env.SKIP_TELEGRAM_CHECK = 'true';
process.env.ALLOW_BROWSER_ACCESS = 'true';

console.log('=================================================');
console.log('  ЗАПУСК UNIFARM БЕЗ ПРОВЕРКИ TELEGRAM');
console.log('=================================================');
console.log(`DATABASE_PROVIDER = ${process.env.DATABASE_PROVIDER}`);
console.log(`FORCE_NEON_DB = ${process.env.FORCE_NEON_DB}`);
console.log(`OVERRIDE_DB_PROVIDER = ${process.env.OVERRIDE_DB_PROVIDER}`);
console.log(`SKIP_TELEGRAM_CHECK = ${process.env.SKIP_TELEGRAM_CHECK}`);
console.log(`ALLOW_BROWSER_ACCESS = ${process.env.ALLOW_BROWSER_ACCESS}`);
console.log(`NODE_ENV = ${process.env.NODE_ENV}`);
console.log(`PORT = ${process.env.PORT || 3000}`);
console.log('=================================================');
console.log(`Время запуска: ${new Date().toISOString()}`);
console.log('=================================================');

// Импортируем и запускаем основное приложение
import('./dist/index.js').catch(err => {
  console.error('Ошибка при запуске приложения:', err);
  process.exit(1);
});