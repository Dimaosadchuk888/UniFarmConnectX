/**
 * Скрипт для запуска приложения в режиме production в Replit
 * Этот скрипт сначала останавливает текущие процессы Node.js,
 * а затем запускает приложение в production режиме
 */

const { exec } = require('child_process');

// Устанавливаем переменную окружения NODE_ENV=production
process.env.NODE_ENV = 'production';

console.log('🚀 Запуск UniFarm в режиме PRODUCTION через Replit...');

// Функция для выполнения команды и возврата промиса
function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Выполняем: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Ошибка выполнения: ${error.message}`);
        // В этом случае мы НЕ отклоняем промис, чтобы продолжить выполнение
        resolve({ stdout, stderr });
        return;
      }
      
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      
      resolve({ stdout, stderr });
    });
  });
}

// Основная функция
async function startProductionMode() {
  try {
    // Попытка остановить все процессы Node.js
    console.log('Остановка текущих процессов...');
    await runCommand('pkill -f "node " || true');
    await runCommand('pkill -f "tsx " || true');
    
    // Небольшая пауза для завершения процессов
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Проверяем наличие dist/index.js 
    console.log('Проверка наличия собранных файлов...');
    await runCommand('ls -la dist');
    
    // Заменяем запуск bash-скрипта на прямой запуск node
    console.log('Запуск приложения в режиме production...');
    console.log('NODE_ENV=', process.env.NODE_ENV);
    
    // Запускаем через exec, чтобы не блокировать текущий процесс
    const nodeProcess = exec('NODE_ENV=production node dist/index.js', {
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    nodeProcess.stdout.on('data', (data) => {
      console.log(`[PRODUCTION] ${data.toString()}`);
    });
    
    nodeProcess.stderr.on('data', (data) => {
      console.error(`[PRODUCTION ERR] ${data.toString()}`);
    });
    
    nodeProcess.on('close', (code) => {
      console.log(`Процесс завершился с кодом ${code}`);
    });
    
    console.log('✅ Приложение запущено в режиме production!');
    console.log('Оставьте этот процесс запущенным для работы приложения.');
    
  } catch (error) {
    console.error('Произошла ошибка:', error);
    process.exit(1);
  }
}

// Запускаем основную функцию
startProductionMode();