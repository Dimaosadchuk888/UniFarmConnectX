/**
 * Основной файл запуска для кнопки Run в Replit
 * 
 * Этот файл автоматически подхватывается Replit при нажатии 
 * на кнопку Run в интерфейсе платформы.
 */

// Просто выводим информацию о том, что используем CJS версию
console.log('🚀 Запуск UniFarm через кнопку Run в Replit');
console.log('⏱️ Переключаемся на CommonJS версию запуска...');

// Используем ES модули импорт
import { spawn } from 'child_process';

// Запускаем наш специальный запускной скрипт
const serverProcess = spawn('node', ['start-app.cjs'], {
  stdio: 'inherit'
});

// Обрабатываем события
serverProcess.on('close', (code) => {
  console.log(`⚠️ Процесс завершился с кодом ${code}`);
  console.log('🔄 Поддерживаем процесс активным...');
});

// Держим процесс активным
setInterval(() => {}, 1000);