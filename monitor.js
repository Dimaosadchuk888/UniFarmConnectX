/**
 * Монитор состояния UniFarm
 * 
 * Этот скрипт запускается отдельно и проверяет:
 * 1. Доступность веб-сервера
 * 2. Подключение к базе данных
 * 3. Использование ресурсов (память, CPU)
 * 4. Логи ошибок
 */

const fs = require('fs').promises;
const http = require('http');
const path = require('path');
const os = require('os');

// Конфигурация
const config = {
  serverUrl: 'https://uni-farm-connect-xo-osadchukdmitro2.replit.app',
  healthEndpoint: '/api/health',
  dbStatusEndpoint: '/api/admin/db-status',
  checkIntervalSec: 60,
  logFile: 'monitor-log.txt',
  errorLogFile: 'error-log.txt',
  maxLogSize: 5 * 1024 * 1024 // 5 MB
};

// Состояние
const state = {
  serverStatus: 'unknown',
  dbStatus: 'unknown',
  lastServerCheck: null,
  lastDbCheck: null,
  restarts: 0,
  errors: 0,
  memoryUsage: {
    history: []
  }
};

// Запись в лог
async function logMessage(message, isError = false) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}\n`;
  
  console.log(message);
  
  try {
    const logFile = isError ? config.errorLogFile : config.logFile;
    
    // Проверяем размер лога и при необходимости ротируем
    try {
      const stats = await fs.stat(logFile);
      if (stats.size > config.maxLogSize) {
        const backupFile = `${logFile}.old`;
        await fs.rename(logFile, backupFile);
      }
    } catch (err) {
      // Файл, вероятно, не существует - это нормально
    }
    
    await fs.appendFile(logFile, formattedMessage);
  } catch (err) {
    console.error('Ошибка записи в лог:', err);
  }
}

// Проверка доступности сервера
async function checkServerHealth() {
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
            state.serverStatus = 'up';
            state.lastServerCheck = new Date();
            resolve({ status: 'up', data: result });
          } catch (err) {
            state.serverStatus = 'error';
            state.errors++;
            resolve({ status: 'error', error: 'Invalid JSON response' });
          }
        } else {
          state.serverStatus = 'down';
          state.errors++;
          resolve({ status: 'down', statusCode: res.statusCode });
        }
      });
    }).on('error', (err) => {
      state.serverStatus = 'unreachable';
      state.errors++;
      resolve({ status: 'unreachable', error: err.message });
    });
  });
}

// Проверка подключения к базе данных
async function checkDatabaseStatus() {
  return new Promise((resolve) => {
    http.get(`${config.serverUrl}${config.dbStatusEndpoint}`, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            state.dbStatus = result.connected ? 'connected' : 'disconnected';
            state.lastDbCheck = new Date();
            resolve({ status: state.dbStatus, data: result });
          } catch (err) {
            state.dbStatus = 'error';
            state.errors++;
            resolve({ status: 'error', error: 'Invalid JSON response' });
          }
        } else {
          state.dbStatus = 'unknown';
          state.errors++;
          resolve({ status: 'error', statusCode: res.statusCode });
        }
      });
    }).on('error', (err) => {
      state.dbStatus = 'unreachable';
      state.errors++;
      resolve({ status: 'unreachable', error: err.message });
    });
  });
}

// Проверка использования ресурсов
function checkResourceUsage() {
  const memoryUsage = process.memoryUsage();
  const systemMemory = {
    total: os.totalmem(),
    free: os.freemem(),
    used: os.totalmem() - os.freemem()
  };
  
  const cpuUsage = os.loadavg();
  
  // Добавляем в историю использования памяти
  state.memoryUsage.history.push({
    timestamp: Date.now(),
    rss: memoryUsage.rss,
    heapTotal: memoryUsage.heapTotal,
    heapUsed: memoryUsage.heapUsed,
    systemUsedPercent: (systemMemory.used / systemMemory.total) * 100
  });
  
  // Ограничиваем размер истории
  if (state.memoryUsage.history.length > 100) {
    state.memoryUsage.history.shift();
  }
  
  return {
    memory: memoryUsage,
    systemMemory,
    cpuUsage
  };
}

// Формирование отчета
function generateStatusReport() {
  const now = new Date();
  const uptime = process.uptime();
  
  const uptimeStr = `${Math.floor(uptime / 3600)}ч ${Math.floor((uptime % 3600) / 60)}м ${Math.floor(uptime % 60)}с`;
  
  const resourceUsage = checkResourceUsage();
  
  const memoryMB = Math.round(resourceUsage.memory.rss / (1024 * 1024));
  const heapMB = Math.round(resourceUsage.memory.heapUsed / (1024 * 1024));
  const systemMemPercent = Math.round((resourceUsage.systemMemory.used / resourceUsage.systemMemory.total) * 100);
  
  const report = [
    '=== ОТЧЕТ О СОСТОЯНИИ UNIFARM ===',
    `Дата отчета: ${now.toISOString()}`,
    `Время работы монитора: ${uptimeStr}`,
    '',
    `Статус сервера: ${state.serverStatus}`,
    `Статус БД: ${state.dbStatus}`,
    `Количество ошибок: ${state.errors}`,
    '',
    `Использование памяти: ${memoryMB} MB (RSS)`,
    `Использование кучи: ${heapMB} MB`,
    `Загрузка системной памяти: ${systemMemPercent}%`,
    `Загрузка CPU (1,5,15 мин): ${resourceUsage.cpuUsage.join(', ')}`,
    '',
    '=== КОНЕЦ ОТЧЕТА ==='
  ].join('\n');
  
  return report;
}

// Основная функция проверки
async function runHealthCheck() {
  try {
    // Проверяем доступность сервера
    const serverHealth = await checkServerHealth();
    
    if (serverHealth.status === 'up') {
      await logMessage(`✅ Сервер доступен и отвечает успешно`);
    } else {
      await logMessage(`⚠️ Проблема с сервером: ${serverHealth.status}`, true);
    }
    
    // Проверяем статус БД
    const dbStatus = await checkDatabaseStatus();
    
    if (dbStatus.status === 'connected') {
      await logMessage(`✅ Подключение к базе данных активно`);
    } else {
      await logMessage(`⚠️ Проблема с БД: ${dbStatus.status}`, true);
    }
    
    // Проверяем ресурсы
    checkResourceUsage();
    
    // Если всё в порядке, генерируем периодический отчет каждые 10 проверок
    if (state.serverStatus === 'up' && state.dbStatus === 'connected') {
      if (Math.random() < 0.1) { // ~10% вероятность
        const report = generateStatusReport();
        await logMessage(report);
      }
    } else {
      // При проблемах всегда генерируем отчет
      const report = generateStatusReport();
      await logMessage(`❌ ОБНАРУЖЕНА ПРОБЛЕМА!\n${report}`, true);
    }
  } catch (err) {
    await logMessage(`❌ Ошибка при выполнении проверки: ${err.message}`, true);
  }
}

// Запуск мониторинга
async function startMonitoring() {
  await logMessage('🚀 Запуск мониторинга UniFarm');
  
  // Запускаем первую проверку сразу
  await runHealthCheck();
  
  // Запускаем периодические проверки
  setInterval(runHealthCheck, config.checkIntervalSec * 1000);
  
  // Выводим периодически полный отчет
  setInterval(async () => {
    const report = generateStatusReport();
    await logMessage(`📊 Периодический отчет:\n${report}`);
  }, 30 * 60 * 1000); // Каждые 30 минут
}

// Запускаем мониторинг
startMonitoring().catch(async (err) => {
  await logMessage(`❌ Критическая ошибка при запуске мониторинга: ${err.message}`, true);
});