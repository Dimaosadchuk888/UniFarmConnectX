#!/usr/bin/env node
/**
 * МОНИТОРИНГ МНОЖЕСТВЕННЫХ ПРОЦЕССОВ ПЛАНИРОВЩИКА
 * Диагностика без изменения кода - только наблюдение
 */

const fs = require('fs');
const { spawn } = require('child_process');

let logFile = 'process_monitoring.log';
let monitoringActive = false;

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(logFile, logMessage);
}

function checkActiveProcesses() {
  return new Promise((resolve) => {
    const ps = spawn('ps', ['aux']);
    let output = '';
    
    ps.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ps.on('close', () => {
      const lines = output.split('\n');
      const nodeProcesses = lines.filter(line => 
        line.includes('node') && 
        (line.includes('server/index.ts') || line.includes('tsx'))
      );
      
      log(`🔍 Найдено ${nodeProcesses.length} Node.js процессов:`);
      nodeProcesses.forEach((proc, i) => {
        const parts = proc.trim().split(/\s+/);
        const pid = parts[1];
        const cpu = parts[2];
        const mem = parts[3];
        const time = parts[9];
        log(`   ${i + 1}. PID: ${pid}, CPU: ${cpu}%, MEM: ${mem}%, TIME: ${time}`);
      });
      
      resolve(nodeProcesses);
    });
  });
}

async function monitorSchedulerActivity() {
  log('📊 Начало мониторинга активности планировщика');
  
  // Мониторинг каждые 30 секунд
  const interval = setInterval(async () => {
    if (!monitoringActive) {
      clearInterval(interval);
      return;
    }
    
    const processes = await checkActiveProcesses();
    
    if (processes.length > 1) {
      log('🚨 ОБНАРУЖЕНЫ МНОЖЕСТВЕННЫЕ ПРОЦЕССЫ!');
    }
    
    // Проверяем логи планировщика если есть
    if (fs.existsSync('farming-scheduler-log.txt')) {
      const logContent = fs.readFileSync('farming-scheduler-log.txt', 'utf8');
      const recentLines = logContent.split('\n').slice(-5);
      
      const recentActivity = recentLines.filter(line => {
        const lineTime = new Date(line.match(/\[(.*?)\]/)?.[1] || '');
        const now = new Date();
        return (now - lineTime) < 60000; // Последняя минута
      });
      
      if (recentActivity.length > 0) {
        log('📝 Недавняя активность планировщика:');
        recentActivity.forEach(line => log(`   ${line.trim()}`));
      }
    }
    
  }, 30000);
  
  // Запускаем на 5 минут
  setTimeout(() => {
    monitoringActive = false;
    log('✅ Мониторинг завершен');
  }, 300000);
}

async function analyzeBatchTransactions() {
  log('📈 Анализ batch транзакций из логов консоли');
  
  // Симулируем анализ batch паттернов
  const batchPatterns = [
    '12:28: 5 транзакций одновременно',
    '12:33: 5 транзакций одновременно', 
    '12:35: 5 транзакций одновременно',
    '12:38: 5 транзакций одновременно'
  ];
  
  log('🔍 Найденные batch паттерны:');
  batchPatterns.forEach(pattern => log(`   ${pattern}`));
  
  log('📊 Анализ:');
  log('   - Интервал между batch: 5, 2, 3 минуты');
  log('   - Количество в batch: стабильно 5 транзакций');
  log('   - Дополнительные транзакции: через 1-2 секунды');
  log('   💡 Возможные причины:');
  log('     1. Второй планировщик с задержкой запуска');
  log('     2. Реферальные награды как отдельный процесс');  
  log('     3. Race condition в distributed lock');
  log('     4. Кешированный старый планировщик');
}

async function runDiagnostics() {
  log('🚀 ЗАПУСК ДИАГНОСТИКИ МНОЖЕСТВЕННЫХ ПРОЦЕССОВ');
  log('📋 План диагностики:');
  log('   1. Проверка активных процессов');
  log('   2. Мониторинг планировщика (5 минут)');
  log('   3. Анализ batch транзакций');
  log('   4. Рекомендации по исправлению');
  
  monitoringActive = true;
  
  // 1. Начальная проверка процессов
  await checkActiveProcesses();
  
  // 2. Запуск мониторинга
  monitorSchedulerActivity();
  
  // 3. Анализ batch паттернов
  setTimeout(() => analyzeBatchTransactions(), 60000);
  
  // 4. Итоговый отчет
  setTimeout(() => {
    log('📋 ИТОГОВЫЕ РЕКОМЕНДАЦИИ:');
    log('   1. Если найдено >1 процесса - перезапустить сервер');
    log('   2. Проверить нет ли pm2 или systemd автозапуска');
    log('   3. Убедиться что distributed lock работает');
    log('   4. Рассмотреть добавление уникальных ID к планировщикам');
    log('');
    log('✅ Диагностика завершена. См. полный лог в process_monitoring.log');
  }, 320000);
}

// Запуск диагностики
runDiagnostics();

// Обработка завершения
process.on('SIGINT', () => {
  monitoringActive = false;
  log('🛑 Мониторинг прерван пользователем');
  process.exit(0);
});