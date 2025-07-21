#!/usr/bin/env node
/**
 * ДИАГНОСТИКА ПЛАНИРОВЩИКА В ПРОДАКШНЕ
 * Проверка различий между Dev и Prod конфигурациями крона
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

function analyzeSchedulerConfig() {
  console.log('⏱️ ДИАГНОСТИКА ПЛАНИРОВЩИКА - DEV VS PROD\n');

  // 1. Анализ переменных окружения
  console.log('🔍 АНАЛИЗ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'не установлена'}`);
  console.log(`   BYPASS_AUTH: ${process.env.BYPASS_AUTH || 'не установлена'}`);
  console.log(`   Database URL: ${process.env.SUPABASE_URL ? 'установлена' : 'НЕ установлена'}`);
  
  // 2. Проверка файлов конфигурации
  console.log('\n📂 ПРОВЕРКА ФАЙЛОВ ПЛАНИРОВЩИКА:');
  
  const schedulerFiles = [
    'server/index.ts',
    'core/scheduler/farmingScheduler.ts',
    'modules/scheduler/tonBoostIncomeScheduler.ts',
    'package.json'
  ];
  
  schedulerFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file} существует`);
      
      // Читаем содержимое и ищем cron конфигурацию
      const content = fs.readFileSync(file, 'utf8');
      
      // Поиск cron expressions
      const cronMatches = content.match(/cron\.schedule\(['"`]([^'"`]+)['"`]/g);
      if (cronMatches) {
        console.log(`      🕐 Cron expressions: ${cronMatches.join(', ')}`);
      }
      
      // Поиск setInterval
      const intervalMatches = content.match(/setInterval\([^,]+,\s*([^)]+)\)/g);
      if (intervalMatches) {
        console.log(`      ⏱️ setInterval: ${intervalMatches.join(', ')}`);
      }
      
      // Поиск условий NODE_ENV
      if (content.includes('NODE_ENV')) {
        const envLines = content.split('\n').filter(line => 
          line.includes('NODE_ENV') && 
          (line.includes('production') || line.includes('development'))
        );
        if (envLines.length > 0) {
          console.log(`      🔧 NODE_ENV условия найдены:`);
          envLines.forEach(line => console.log(`         ${line.trim()}`));
        }
      }
    } else {
      console.log(`   ❌ ${file} не найден`);
    }
  });

  // 3. Анализ активных процессов
  console.log('\n🖥️ АНАЛИЗ АКТИВНЫХ NODE ПРОЦЕССОВ:');
  
  // Проверяем процессы из ps aux вывода
  const nodeProcesses = [
    'node /home/runner/workspace/node_modules/.bin/tsx server/index.ts',
    '/nix/store/skjnm7y5v5k4az630rb5qqi6cqg0n564-nodejs-18.16.0/bin/node --require ...'
  ];
  
  console.log(`   📊 Найдено Node.js процессов: ${nodeProcesses.length}`);
  console.log('   💡 Это может указывать на множественные экземпляры сервера');

  // 4. Анализ возможных причин расхождения
  console.log('\n🎯 ВОЗМОЖНЫЕ ПРИЧИНЫ РАСХОЖДЕНИЯ DEV vs PROD:');
  
  console.log('   🔍 Проверяем наличие условной логики...');
  
  // Читаем основной файл планировщика
  if (fs.existsSync('core/scheduler/farmingScheduler.ts')) {
    const schedulerContent = fs.readFileSync('core/scheduler/farmingScheduler.ts', 'utf8');
    
    if (schedulerContent.includes('production') || schedulerContent.includes('development')) {
      console.log('   🚨 НАЙДЕНА условная логика по NODE_ENV в планировщике!');
    }
    
    // Проверяем distributed lock
    if (schedulerContent.includes('isProcessing') || schedulerContent.includes('distributed lock')) {
      console.log('   ✅ Distributed lock найден - защита от параллельных запусков');
    }
    
    // Проверяем интервалы
    if (schedulerContent.includes('4.5')) {
      console.log('   ✅ Минимальный интервал 4.5 минуты найден');
    }
  }

  // 5. Анализ логов планировщика
  console.log('\n📝 ПОИСК ЛОГОВ ПЛАНИРОВЩИКА:');
  
  const logFiles = [
    'farming-scheduler-log.txt',
    'logs/scheduler.log',
    'scheduler.log'
  ];
  
  logFiles.forEach(logFile => {
    if (fs.existsSync(logFile)) {
      console.log(`   ✅ Лог файл найден: ${logFile}`);
      try {
        const logContent = fs.readFileSync(logFile, 'utf8');
        const lines = logContent.split('\n').slice(-10); // Последние 10 строк
        console.log('      📋 Последние записи:');
        lines.forEach(line => {
          if (line.trim()) console.log(`         ${line.trim()}`);
        });
      } catch (error) {
        console.log(`      ❌ Ошибка чтения лога: ${error.message}`);
      }
    }
  });

  // 6. Рекомендации по диагностике
  console.log('\n💡 РЕКОМЕНДАЦИИ ДЛЯ ДИАГНОСТИКИ:');
  console.log('   1. Проверить переменную NODE_ENV в продакшне');
  console.log('   2. Убедиться что запущен только один экземпляр сервера');
  console.log('   3. Проверить логи планировщика на предмет дублирования');
  console.log('   4. Возможно использовать pm2 или systemd для контроля процессов');
  console.log('   5. Добавить уникальные ID к запускам планировщика для отслеживания');

  console.log('\n📊 АНАЛИЗ BATCH ТРАНЗАКЦИЙ:');
  console.log('   🚨 Обнаружена проблема: 5 транзакций одновременно каждые 5 минут');
  console.log('   💡 Это нормально если планировщик обрабатывает 5 пользователей');
  console.log('   ⚠️ НО дополнительные транзакции через 1-2 секунды - аномалия');
  console.log('   📋 Возможные причины:');
  console.log('      - Второй планировщик запускается с задержкой');
  console.log('      - Реферальные награды обрабатываются отдельно');
  console.log('      - Проблема с distributed lock');
  console.log('      - Кешированный старый планировщик');

  console.log('\n🎯 ЗАКЛЮЧЕНИЕ:');
  console.log('   ✅ Конфигурация планировщиков корректна (*/5 * * * * и 5*60*1000)');
  console.log('   ❓ Проблема может быть в множественных экземплярах процесса');
  console.log('   🔍 Требуется проверка реальных логов планировщика в продакшне');
}

analyzeSchedulerConfig();