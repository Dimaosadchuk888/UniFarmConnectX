/**
 * Полный перезапуск сервера с новыми настройками
 */

import { spawn, execSync } from 'child_process';

console.log('🔄 Перезапуск сервера с обновленными настройками...');

// Останавливаем все работающие процессы
try {
  console.log('⏹️ Остановка старых процессов...');
  execSync('pkill -f "tsx\\|node.*server\\|start-unified"', { stdio: 'ignore' });
  console.log('✅ Старые процессы остановлены');
} catch (error) {
  console.log('ℹ️ Процессы не найдены или уже остановлены');
}

// Ждем немного для корректного завершения
await new Promise(resolve => setTimeout(resolve, 2000));

// Запускаем сервер заново
console.log('🚀 Запуск обновленного сервера...');

const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: { 
    ...process.env, 
    NODE_ENV: 'development',
    FORCE_RESTART: 'true'
  }
});

serverProcess.on('error', (error) => {
  console.error('❌ Ошибка запуска сервера:', error);
});

serverProcess.on('exit', (code) => {
  console.log(`Сервер завершился с кодом ${code}`);
});

// Обработка завершения скрипта
process.on('SIGINT', () => {
  console.log('⏹️ Завершение сервера...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});