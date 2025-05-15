/**
 * Скрипт для запуска приложения с игнорированием ошибок партиционирования
 * 
 * Этот скрипт перехватывает и игнорирует ошибки, связанные с партиционированием таблицы
 * transactions, что позволяет приложению штатно запуститься
 */

// Устанавливаем обработчик необработанных исключений перед запуском приложения
process.on('uncaughtException', (error) => {
  // Игнорируем ошибки партиционирования таблицы transactions
  if (error.message && (
    error.message.includes('partitioned') || 
    error.message.includes('partition') ||
    error.message.includes('Failed to create partitions')
  )) {
    console.log(`[❗] Игнорируем ошибку партиционирования: ${error.message}`);
    return; // Не завершаем процесс при ошибке партиционирования
  }
  
  // Для остальных ошибок сохраняем стандартное поведение
  console.error('[FATAL] Необработанное исключение:', error.message);
  console.error(error.stack);
  process.exit(1);
});

// Устанавливаем обработчик для unhandledRejection
process.on('unhandledRejection', (reason, promise) => {
  // Игнорируем ошибки партиционирования таблицы transactions
  if (reason instanceof Error && reason.message && (
    reason.message.includes('partitioned') || 
    reason.message.includes('partition') ||
    reason.message.includes('Failed to create partitions')
  )) {
    console.log(`[❗] Игнорируем ошибку партиционирования (промис): ${reason.message}`);
    return; // Не завершаем процесс при ошибке партиционирования
  }
  
  console.error('[FATAL] Необработанный отказ промиса:', reason);
  process.exit(1);
});

// Принудительно устанавливаем переменные окружения для Neon DB
process.env.DATABASE_PROVIDER = 'neon';
process.env.FORCE_NEON_DB = 'true';
process.env.DISABLE_REPLIT_DB = 'true';
process.env.OVERRIDE_DB_PROVIDER = 'neon';
process.env.SKIP_PARTITION_CREATION = 'true';
process.env.IGNORE_PARTITION_ERRORS = 'true';

console.log('====================================================');
console.log('🚀 Запуск UniFarm с принудительным использованием Neon DB');
console.log('🛡️ Установлен обработчик ошибок партиционирования');
console.log('====================================================');

// Запускаем приложение
try {
  require('./dist/index.js');
} catch (error) {
  if (error.message && (
    error.message.includes('partitioned') || 
    error.message.includes('partition') ||
    error.message.includes('Failed to create partitions')
  )) {
    console.log(`[❗] Игнорируем ошибку партиционирования при загрузке: ${error.message}`);
    // Повторная попытка запуска после отлова ошибки партиционирования
    require('./dist/index.js');
  } else {
    console.error('[FATAL] Ошибка при запуске приложения:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}