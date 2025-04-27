/**
 * Скрипт для запуска приложения в режиме production в Replit
 * Этот скрипт использует CommonJS модули
 */

const { exec, spawn } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

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
    // Убиваем все процессы, кроме текущего скрипта
    console.log('Остановка текущих процессов...');
    
    // Получаем PID текущего процесса
    const currentPid = process.pid;
    console.log(`Текущий PID: ${currentPid}`);
    
    // Останавливаем только другие процессы Node.js
    await runCommand(`pkill -f "npm run dev" || true`);
    await runCommand(`ps aux | grep node | grep -v ${currentPid} | awk '{print $2}' | xargs kill -9 2>/dev/null || true`);
    await runCommand(`pkill -f "tsx " || true`);
    
    // Небольшая пауза для завершения процессов
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Проверяем, освободился ли порт 5000
    const portCheckResult = await runCommand('lsof -i :5000 || echo "Port 5000 is free"');
    if (portCheckResult.stdout && !portCheckResult.stdout.includes("Port 5000 is free")) {
      console.log('⚠️ Порт 5000 все еще занят. Принудительное освобождение...');
      await runCommand('fuser -k 5000/tcp || true');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Проверяем наличие dist/index.js 
    console.log('Проверка наличия собранных файлов...');
    await runCommand('ls -la dist');
    
    // Запуск сервера в production режиме
    console.log('Запуск приложения в режиме production...');
    console.log('NODE_ENV=', process.env.NODE_ENV);
    
    // Используем spawn для запуска процесса, чтобы видеть его вывод в реальном времени
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