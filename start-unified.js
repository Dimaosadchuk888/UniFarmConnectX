// @ts-check
// @ts-nocheck
// @ts-ignore

/**
 * Универсальный скрипт запуска приложения UniFarm
 * Работает как в режиме разработки, так и в production-среде Replit
 * Адаптирован для работы в ESM среде (package.json type: module)
 * 
 * @format
 * @type {module}
 * @packageDocumentation
 */

// Определяем текущий режим
const isProd = process.env.NODE_ENV === 'production';
// Используем порт 3000 даже в production режиме для совместимости с Replit
const port = process.env.PORT || '3000';

console.log(`🚀 Запуск UniFarm в ${isProd ? 'production' : 'development'} режиме на порту ${port}`);

// В режиме production используем специальную конфигурацию
if (isProd) {
  console.log('✅ Используем production-конфигурацию');
  
  // Настраиваем переменные окружения для production
  process.env.PORT = port;
  
  try {
    console.log('🔄 Запуск production-сервера...');
    
    // Динамический импорт для ES модулей
    const childProcess = await import('child_process');
    
    // Используем дочерний процесс для запуска ESM модуля
    const server = childProcess.spawn('node', ['production-server.mjs'], {
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    server.on('error', async (err) => {
      console.error('❌ Ошибка при запуске production-сервера:', err);
      
      // Пробуем запасной вариант с .js файлом
      console.log('🔄 Пробуем запустить через запасной механизм...');
      try {
        const fallbackServer = childProcess.spawn('node', ['production-server.js'], {
          stdio: 'inherit',
          env: { ...process.env }
        });
        
        fallbackServer.on('error', (fallbackErr) => {
          console.error('❌ Ошибка при запуске запасного механизма:', fallbackErr);
          process.exit(1);
        });
      } catch (fallbackErr) {
        console.error('❌ Критическая ошибка запуска:', fallbackErr);
        process.exit(1);
      }
    });
  } catch (err) {
    console.error('❌ Критическая ошибка запуска:', err);
    process.exit(1);
  }
} else {
  // В режиме разработки запускаем стандартный процесс
  console.log('✅ Используем конфигурацию для разработки');
  
  try {
    // Используем динамический импорт для ESM
    import('./server/index.ts').catch(err => {
      console.error('❌ Ошибка при импорте ./server/index.ts:', err);
      
      // Пробуем fallback
      import('./server/index.js').catch(err2 => {
        console.error('❌ Ошибка при импорте ./server/index.js:', err2);
        
        // Последняя попытка - прямой запуск из dist
        import('./dist/index.js').catch(err3 => {
          console.error('❌ Все попытки импорта ./server неудачны:', err3);
          process.exit(1);
        });
      });
    });
  } catch (error) {
    console.error('❌ Ошибка при запуске сервера разработки:', error);
    process.exit(1);
  }
}