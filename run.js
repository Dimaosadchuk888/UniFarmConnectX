/**
 * Основной файл запуска для кнопки Run в Replit
 * 
 * Этот файл автоматически подхватывается Replit при нажатии 
 * на кнопку Run в интерфейсе платформы.
 */

// Выводим информацию о запуске
console.log('🚀 Запуск UniFarm через кнопку Run в Replit');
console.log('📅 Время запуска:', new Date().toISOString());
console.log('⏱️ Инициализация прямого запуска сервера...');

// Используем ES модули импорт
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Сохраняем время запуска для расчета uptime
const startTime = Date.now();

// Переменные для контроля состояния процессов
let serverProcess = null;
let isShuttingDown = false;
let healthcheckInterval = null;
let restartCount = 0;

// Проверяем активность сервера через HTTP запрос
async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (response.ok) {
      console.log('✅ [Healthcheck] Сервер работает стабильно');
      return true;
    }
    console.log('⚠️ [Healthcheck] Сервер работает, но вернул ошибку:', response.status);
    return false;
  } catch (error) {
    console.log('❌ [Healthcheck] Сервер недоступен:', error.message);
    return false;
  }
}

// Функция для запуска сервера
function startServer() {
  console.log('🔄 Запуск сервера...');
  
  // Запускаем сервер напрямую через server/index.ts (без промежуточных скриптов)
  serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: '3000',
      HOST: '0.0.0.0', // Гарантируем привязку к внешнему IP
      NODE_ENV: 'production',
      SKIP_PROCESS_EXIT: 'true', // Предотвращаем выход из процесса
      SKIP_TELEGRAM_CHECK: 'true',
      ALLOW_BROWSER_ACCESS: 'true'
    }
  });

  // Обрабатываем закрытие сервера
  serverProcess.on('close', (code) => {
    console.log(`⚠️ Сервер завершил работу с кодом ${code}`);
    
    if (!isShuttingDown) {
      restartCount++;
      
      const delay = Math.min(5000 + (restartCount * 1000), 15000); // Увеличиваем задержку с каждым перезапуском
      console.log(`🔄 Перезапуск через ${delay/1000} секунд (попытка #${restartCount})...`);
      
      setTimeout(() => {
        if (!isShuttingDown) {
          startServer();
        }
      }, delay);
    }
  });

  // Обрабатываем ошибки запуска
  serverProcess.on('error', (error) => {
    console.error('❌ Ошибка запуска сервера:', error);
    
    if (!isShuttingDown) {
      const delay = 5000;
      console.log(`🔄 Повторная попытка запуска через ${delay/1000} секунд...`);
      
      setTimeout(() => {
        if (!isShuttingDown) {
          startServer();
        }
      }, delay);
    }
  });
}

// Запускаем сервер
startServer();

// Настраиваем регулярную проверку состояния
healthcheckInterval = setInterval(async () => {
  await checkServerHealth();
  
  // Выводим статистику времени работы каждые 10 минут
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  if (uptimeSeconds % 600 === 0) {
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    
    console.log(`⏱️ Время работы: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  }
}, 30000);

// Обрабатываем сигналы
process.on('SIGINT', () => {
  console.log('📣 Получен сигнал SIGINT, игнорируем для поддержания работы в Replit');
});

process.on('SIGTERM', () => {
  console.log('📣 Получен сигнал SIGTERM, игнорируем для поддержания работы в Replit');
});

// Обрабатываем необработанные исключения
process.on('uncaughtException', (err) => {
  console.error('❌ Необработанное исключение:', err);
  console.log('✅ Продолжаем работу основного процесса');
});

// Обрабатываем отклоненные промисы
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанный промис:', reason);
  console.log('✅ Продолжаем работу основного процесса');
});

// Держим процесс активным через короткий интервал
setInterval(() => {}, 1000);

console.log('✅ Запуск инициализирован, сервер должен быть доступен в Preview в течение 10-30 секунд');