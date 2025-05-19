#!/usr/bin/env node
/**
 * Командная строка для управления UniFarm
 * 
 * Позволяет запускать, останавливать, перезапускать и проверять состояние приложения.
 * Использование: node unifarm-cli.js [команда]
 * 
 * Доступные команды:
 * - start: Запустить сервер
 * - status: Проверить статус сервера
 * - restart: Перезапустить сервер
 * - monitor: Запустить только мониторинг
 * - logs: Показать последние логи
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');

// Конфигурация
const config = {
  serverUrl: 'http://localhost:3000',
  healthEndpoint: '/api/health',
  logDir: './logs',
  mainLogFile: 'unifarm.log',
  errorLogFile: 'error.log',
  pidFile: '.unifarm.pid',
  lineCount: 50 // Количество строк логов для вывода
};

// Получение команды
const command = process.argv[2] || 'help';

// Вывод помощи
function showHelp() {
  console.log('\nУправление UniFarm');
  console.log('=====================');
  console.log('Использование: node unifarm-cli.js [команда]');
  console.log('\nДоступные команды:');
  console.log('  start    - Запустить сервер');
  console.log('  status   - Проверить статус сервера');
  console.log('  restart  - Перезапустить сервер');
  console.log('  monitor  - Запустить только мониторинг');
  console.log('  logs     - Показать последние логи (--error для логов ошибок)');
  console.log('  help     - Показать эту справку');
  console.log('\nПримеры:');
  console.log('  node unifarm-cli.js start');
  console.log('  node unifarm-cli.js logs --error');
  console.log('=====================\n');
}

// Проверка работающего процесса
async function checkRunningProcess() {
  try {
    const data = await fs.readFile(config.pidFile, 'utf8');
    const pid = parseInt(data.trim(), 10);
    
    // Проверяем, существует ли процесс
    try {
      process.kill(pid, 0); // Проверка существования процесса
      return { running: true, pid };
    } catch (err) {
      // Процесс не существует
      return { running: false, pid: null };
    }
  } catch (err) {
    // Файл PID не существует
    return { running: false, pid: null };
  }
}

// Сохранение PID
async function savePid(pid) {
  try {
    await fs.writeFile(config.pidFile, pid.toString());
    console.log(`PID ${pid} сохранен в ${config.pidFile}`);
  } catch (err) {
    console.error(`Ошибка при сохранении PID: ${err.message}`);
  }
}

// Запись в лог
async function logMessage(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Запуск сервера
async function startServer() {
  // Проверяем, не запущен ли уже сервер
  const processInfo = await checkRunningProcess();
  if (processInfo.running) {
    console.log(`Сервер уже запущен (PID: ${processInfo.pid})`);
    await checkServerStatus();
    return;
  }
  
  // Создаем директорию для логов, если не существует
  try {
    await fs.mkdir(config.logDir, { recursive: true });
  } catch (err) {
    console.error(`Ошибка при создании директории для логов: ${err.message}`);
  }
  
  // Запускаем сервер
  console.log('Запуск UniFarm...');
  
  const serverProcess = spawn('node', ['start-unifarm.js'], {
    detached: true,
    stdio: 'ignore' // Отключаем ввод/вывод для запуска в фоне
  });
  
  // Сохраняем PID
  await savePid(serverProcess.pid);
  
  // Отсоединяем процесс
  serverProcess.unref();
  
  console.log(`Сервер UniFarm запущен (PID: ${serverProcess.pid})`);
  console.log('Проверка доступности...');
  
  // Дадим серверу время на запуск
  setTimeout(() => {
    checkServerStatus();
  }, 3000);
}

// Запуск мониторинга
async function startMonitoring() {
  console.log('Запуск мониторинга...');
  
  // Создаем директорию для логов, если не существует
  try {
    await fs.mkdir(config.logDir, { recursive: true });
  } catch (err) {
    console.error(`Ошибка при создании директории для логов: ${err.message}`);
  }
  
  const monitorProcess = spawn('node', ['monitor.js'], {
    detached: true,
    stdio: 'ignore' // Отключаем ввод/вывод для запуска в фоне
  });
  
  // Отсоединяем процесс
  monitorProcess.unref();
  
  console.log(`Мониторинг запущен (PID: ${monitorProcess.pid})`);
}

// Проверка статуса сервера
async function checkServerStatus() {
  try {
    // Проверяем файл PID
    const processInfo = await checkRunningProcess();
    
    if (!processInfo.running) {
      console.log('❌ Сервер не запущен');
      return false;
    }
    
    console.log(`✅ Процесс сервера запущен (PID: ${processInfo.pid})`);
    
    // Проверяем доступность сервера HTTP-запросом
    return new Promise((resolve) => {
      http.get(`${config.serverUrl}${config.healthEndpoint}`, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const result = JSON.parse(data);
              console.log('✅ Сервер отвечает на HTTP-запросы');
              console.log('📊 Статус сервера:', result);
              resolve(true);
            } catch (err) {
              console.log('⚠️ Сервер отвечает, но вернул некорректный JSON');
              resolve(false);
            }
          } else {
            console.log(`⚠️ Сервер вернул ошибку: HTTP ${res.statusCode}`);
            resolve(false);
          }
        });
      }).on('error', (err) => {
        console.log(`❌ Не удалось подключиться к серверу: ${err.message}`);
        console.log('Сервер запущен, но не отвечает на HTTP-запросы');
        resolve(false);
      });
    });
  } catch (err) {
    console.error(`Ошибка при проверке статуса: ${err.message}`);
    return false;
  }
}

// Перезапуск сервера
async function restartServer() {
  try {
    const processInfo = await checkRunningProcess();
    
    if (processInfo.running) {
      console.log(`Остановка сервера (PID: ${processInfo.pid})...`);
      
      try {
        process.kill(processInfo.pid);
        console.log('Сервер остановлен');
      } catch (err) {
        console.error(`Ошибка при остановке сервера: ${err.message}`);
      }
    } else {
      console.log('Сервер не был запущен');
    }
    
    // Удаляем файл PID
    try {
      await fs.unlink(config.pidFile);
    } catch (err) {
      // Игнорируем ошибку, если файл не существует
    }
    
    console.log('Запуск сервера...');
    await startServer();
  } catch (err) {
    console.error(`Ошибка при перезапуске: ${err.message}`);
  }
}

// Показ логов
async function showLogs(options) {
  const isErrorLog = options.includes('--error');
  const logFile = path.join(config.logDir, isErrorLog ? config.errorLogFile : config.mainLogFile);
  
  try {
    const fileExists = await fs.access(logFile).then(() => true).catch(() => false);
    
    if (!fileExists) {
      console.log(`Лог-файл ${logFile} не существует`);
      return;
    }
    
    // В Unix можно использовать tail, в Windows - более сложный подход
    if (process.platform === 'win32') {
      // Для Windows - читаем файл и показываем последние N строк
      const data = await fs.readFile(logFile, 'utf8');
      const lines = data.split('\n');
      const lastLines = lines.slice(-config.lineCount);
      
      console.log(`=== Последние ${lastLines.length} строк ${isErrorLog ? 'ошибок' : 'логов'} ===`);
      console.log(lastLines.join('\n'));
    } else {
      // Для Unix - используем tail
      exec(`tail -n ${config.lineCount} ${logFile}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Ошибка: ${error.message}`);
          return;
        }
        
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          return;
        }
        
        console.log(`=== Последние ${config.lineCount} строк ${isErrorLog ? 'ошибок' : 'логов'} ===`);
        console.log(stdout);
      });
    }
  } catch (err) {
    console.error(`Ошибка при чтении лог-файла: ${err.message}`);
  }
}

// Обработка команд
async function processCommand() {
  switch (command) {
    case 'start':
      await startServer();
      break;
      
    case 'status':
      await checkServerStatus();
      break;
      
    case 'restart':
      await restartServer();
      break;
      
    case 'monitor':
      await startMonitoring();
      break;
      
    case 'logs':
      await showLogs(process.argv.slice(3));
      break;
      
    case 'help':
    default:
      showHelp();
      break;
  }
}

// Запуск обработки команд
processCommand().catch(err => {
  console.error('Критическая ошибка:', err);
});