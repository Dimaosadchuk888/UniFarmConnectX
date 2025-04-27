/**
 * Скрипт для запуска приложения в режиме production в Replit
 * Этот скрипт использует систему модулей ESM
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Устанавливаем переменную окружения NODE_ENV=production
process.env.NODE_ENV = 'production';

console.log('🚀 Запуск UniFarm в режиме PRODUCTION...');

// Функция для выполнения команды и возврата промиса
async function runCommand(command) {
  console.log(`Выполняем: ${command}`);
  
  try {
    const { stdout, stderr } = await execPromise(command);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    return { success: true, stdout, stderr };
  } catch (error) {
    console.error(`Ошибка выполнения: ${error.message}`);
    return { success: false, error, stdout: error.stdout, stderr: error.stderr };
  }
}

// Основная функция
async function startProductionMode() {
  try {
    // Остановка всех процессов Node.js
    console.log('Остановка текущих процессов...');
    await runCommand('pkill -f "node " || true');
    await runCommand('pkill -f "tsx " || true');
    
    // Небольшая пауза для завершения процессов
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Запуск сервера в production режиме
    console.log('Запуск приложения в режиме production...');
    console.log('NODE_ENV=', process.env.NODE_ENV);
    
    // Используем spawn для запуска процесса, чтобы видеть его вывод в реальном времени
    const { spawn } = await import('child_process');
    
    const nodeProcess = spawn('node', ['dist/index.js'], {
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: 'inherit' // Перенаправляем ввод/вывод в родительский процесс
    });
    
    nodeProcess.on('error', (err) => {
      console.error('Ошибка запуска процесса:', err);
    });
    
    // Обработка сигналов завершения для корректной остановки сервера
    process.on('SIGINT', () => {
      console.log('Получен сигнал SIGINT, завершаем процесс...');
      nodeProcess.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
      console.log('Получен сигнал SIGTERM, завершаем процесс...');
      nodeProcess.kill('SIGTERM');
    });
    
    console.log('✅ Приложение запущено в режиме production!');
    console.log('Оставьте этот процесс запущенным для работы приложения.');
    
  } catch (error) {
    console.error('Произошла критическая ошибка:', error);
    process.exit(1);
  }
}

// Запускаем основную функцию
startProductionMode();