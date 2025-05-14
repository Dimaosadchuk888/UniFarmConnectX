/**
 * Универсальный скрипт запуска приложения UniFarm
 * Работает как в режиме разработки, так и в production-среде Replit
 * 
 * @format
 * @type {CommonJS}
 */

// Явно указываем, что этот файл использует CommonJS
// Это заставит Replit использовать CommonJS вместо ESM
// See: https://nodejs.org/api/packages.html#packages_type

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
    // Используем require для CommonJS модуля
    require('./production-server.js');
  } catch (error) {
    console.error('❌ Ошибка при запуске production-сервера:', error);
    
    // Пробуем запустить через запасной механизм
    console.log('🔄 Пробуем запустить через запасной механизм...');
    try {
      const { spawn } = require('child_process');
      const server = spawn('node', ['production-server.js'], {
        stdio: 'inherit',
        env: { ...process.env }
      });
      
      server.on('error', (err) => {
        console.error('❌ Ошибка при запуске запасного механизма:', err);
        process.exit(1);
      });
    } catch (err) {
      console.error('❌ Критическая ошибка запуска:', err);
      process.exit(1);
    }
  }
} else {
  // В режиме разработки запускаем стандартный процесс
  console.log('✅ Используем конфигурацию для разработки');
  
  try {
    require('./server');
  } catch (error) {
    console.error('❌ Ошибка при запуске сервера разработки:', error);
    process.exit(1);
  }
}