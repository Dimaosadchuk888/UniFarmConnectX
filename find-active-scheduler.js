#!/usr/bin/env node

/**
 * ПОИСК АКТИВНОГО ПЛАНИРОВЩИКА
 * Определение какой именно код выполняет начисления фарминга
 */

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🔍 ПОИСК АКТИВНОГО ПЛАНИРОВЩИКА UNIFARMING');
console.log('='.repeat(70));

// 1. ПОИСК ВСЕХ ФАЙЛОВ С ПЛАНИРОВЩИКАМИ
console.log('\n📋 1. ПОИСК ВСЕХ ПЛАНИРОВЩИКОВ:');

function findSchedulers() {
  const schedulerFiles = [];
  
  function scanDir(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = `${dir}/${item}`;
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
            scanDir(fullPath);
          } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // Ищем файлы с планировщиками фарминга
            if ((content.includes('cron') || content.includes('schedule')) && 
                (content.includes('farming') || content.includes('reward') || content.includes('income'))) {
              schedulerFiles.push({
                path: fullPath,
                size: (content.length / 1024).toFixed(1) + ' KB',
                content: content,
                lastModified: stat.mtime
              });
            }
          }
        } catch (e) {
          // Игнорируем ошибки доступа
        }
      }
    } catch (e) {
      // Игнорируем ошибки доступа к директориям
    }
  }
  
  scanDir('.');
  return schedulerFiles;
}

const schedulers = findSchedulers();

console.log(`  Найдено ${schedulers.length} файлов с планировщиками:`);

schedulers.forEach((scheduler, index) => {
  console.log(`\n  ${index + 1}. ${scheduler.path}`);
  console.log(`     ├── Размер: ${scheduler.size}`);
  console.log(`     ├── Изменен: ${scheduler.lastModified.toLocaleString()}`);
  
  // Анализируем содержимое
  const lines = scheduler.content.split('\n');
  
  // Ищем CRON выражения
  const cronLines = lines.filter(line => line.includes('cron.schedule') || line.includes('*/5'));
  cronLines.forEach(line => {
    console.log(`     ├── CRON: ${line.trim()}`);
  });
  
  // Ищем методы начисления
  const rewardLines = lines.filter(line => 
    line.includes('addBalance') || 
    line.includes('updateBalance') || 
    line.includes('farming') ||
    line.includes('calculateIncome') ||
    line.includes('processIncome')
  );
  
  if (rewardLines.length > 0) {
    console.log(`     └── Методы начисления (${rewardLines.length}):`);
    rewardLines.slice(0, 3).forEach(line => {
      console.log(`         │ ${line.trim()}`);
    });
    if (rewardLines.length > 3) {
      console.log(`         └── ... еще ${rewardLines.length - 3} методов`);
    }
  }
});

// 2. АНАЛИЗ СЕРВЕРА index.ts
console.log('\n📋 2. АНАЛИЗ ОСНОВНОГО СЕРВЕРА:');

try {
  const serverContent = fs.readFileSync('server/index.ts', 'utf8');
  console.log(`  ├── Размер: ${(serverContent.length / 1024).toFixed(1)} KB`);
  
  // Ищем инициализацию планировщиков
  const lines = serverContent.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('FarmingScheduler') || 
        line.includes('scheduler') || 
        line.includes('start()') ||
        line.includes('cron')) {
      console.log(`  ├── Строка ${index + 1}: ${line.trim()}`);
    }
  });
  
} catch (error) {
  console.log(`  ❌ Ошибка чтения server/index.ts: ${error.message}`);
}

// 3. ПОИСК АЛЬТЕРНАТИВНЫХ ПЛАНИРОВЩИКОВ
console.log('\n📋 3. ПОИСК АЛЬТЕРНАТИВНЫХ ПЛАНИРОВЩИКОВ:');

const alternativeFiles = [
  'modules/scheduler/farmingScheduler.ts',
  'modules/scheduler/uniFarmingScheduler.ts', 
  'core/scheduler/uniFarmingScheduler.ts',
  'server/schedulers/farmingScheduler.ts',
  'scripts/farming-scheduler.ts',
  'scripts/uni-farming-scheduler.ts'
];

alternativeFiles.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const stat = fs.statSync(file);
      console.log(`  ✅ НАЙДЕН: ${file}`);
      console.log(`     ├── Размер: ${(content.length / 1024).toFixed(1)} KB`);
      console.log(`     └── Изменен: ${stat.mtime.toLocaleString()}`);
      
      // Проверяем активность
      if (content.includes('start()') || content.includes('cron.schedule')) {
        console.log(`     ⚠️  СОДЕРЖИТ АКТИВНУЮ ЛОГИКУ!`);
      }
    } catch (e) {
      console.log(`  ❌ Ошибка чтения ${file}: ${e.message}`);
    }
  } else {
    console.log(`  ⚪ Отсутствует: ${file}`);
  }
});

// 4. ПОИСК ЗАПУЩЕННЫХ ЗАДАЧ ЧЕРЕЗ ПРОЦЕССЫ
console.log('\n📋 4. АНАЛИЗ ЗАПУЩЕННЫХ ПРОЦЕССОВ:');

try {
  // Детальный анализ процессов сервера
  const processes = execSync('ps aux | grep -E "tsx|node" | grep -v grep', { encoding: 'utf8' });
  const lines = processes.split('\n').filter(line => line.trim());
  
  console.log(`  Найдено ${lines.length} Node.js процессов:`);
  
  lines.forEach((line, index) => {
    const parts = line.split(/\s+/);
    const pid = parts[1];
    const cpu = parts[2];
    const mem = parts[3];
    const command = line.substring(line.indexOf(parts[10]));
    
    console.log(`\n  ${index + 1}. PID ${pid} (CPU: ${cpu}%, MEM: ${mem}%)`);
    console.log(`     └── ${command.substring(0, 80)}...`);
    
    // Проверяем открытые файлы процесса
    try {
      if (command.includes('server/index.ts')) {
        const openFiles = execSync(`lsof -p ${pid} 2>/dev/null | grep -E "\\.ts|\\.js" | head -5`, { encoding: 'utf8' });
        if (openFiles.trim()) {
          console.log(`     └── Открытые файлы:`);
          openFiles.split('\n').forEach(file => {
            if (file.trim()) console.log(`         │ ${file.split(/\s+/).pop()}`);
          });
        }
      }
    } catch (e) {
      // Игнорируем ошибки lsof
    }
  });
  
} catch (error) {
  console.log(`  ❌ Ошибка анализа процессов: ${error.message}`);
}

// 5. ПОИСК ИМПОРТОВ СТАРОЙ ЛОГИКИ
console.log('\n📋 5. ПОИСК СТАРОЙ ЛОГИКИ ФАРМИНГА:');

function findOldFarmingLogic() {
  const oldLogicFiles = [];
  
  function scanForOldLogic(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = `${dir}/${item}`;
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
            scanForOldLogic(fullPath);
          } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // Ищем старую логику без UnifiedFarmingCalculator
            if ((content.includes('farming') || content.includes('reward')) &&
                content.includes('Math.min') &&
                content.includes('288') &&
                !content.includes('UnifiedFarmingCalculator')) {
              oldLogicFiles.push({
                path: fullPath,
                content: content,
                lastModified: stat.mtime
              });
            }
          }
        } catch (e) {
          // Игнорируем ошибки
        }
      }
    } catch (e) {
      // Игнорируем ошибки
    }
  }
  
  scanForOldLogic('.');
  return oldLogicFiles;
}

const oldLogic = findOldFarmingLogic();

console.log(`  Найдено ${oldLogic.length} файлов со старой логикой:`);

oldLogic.forEach((file, index) => {
  console.log(`\n  ${index + 1}. ${file.path}`);
  console.log(`     └── Изменен: ${file.lastModified.toLocaleString()}`);
  
  // Ищем подозрительные строки
  const lines = file.content.split('\n');
  lines.forEach((line, lineNum) => {
    if (line.includes('Math.min') && line.includes('288')) {
      console.log(`       │ Строка ${lineNum + 1}: ${line.trim()}`);
    }
  });
});

// 6. ФИНАЛЬНАЯ ПРОВЕРКА АКТИВНОГО КОДА
console.log('\n📋 6. ПРОВЕРКА ФАКТИЧЕСКИ ВЫПОЛНЯЕМОГО КОДА:');

// Проверяем что происходит сейчас
const currentTime = new Date();
console.log(`  Текущее время: ${currentTime.toLocaleTimeString()}`);

// Анализ изменения баланса из логов
const balanceChanges = [
  { time: '09:36', balance: 277441.755287 },
  { time: '09:39', balance: 277660.887231 },
  { time: '09:43', balance: 278103.901397 },
  { time: '10:03', balance: 279684.127298 }
];

console.log(`\n  Анализ изменений баланса:`);
for (let i = 1; i < balanceChanges.length; i++) {
  const current = balanceChanges[i];
  const previous = balanceChanges[i-1];
  const change = current.balance - previous.balance;
  const expectedInterval = 0.669826;
  const ratio = change / expectedInterval;
  
  console.log(`    ${current.time}: +${change.toFixed(2)} UNI (${ratio.toFixed(0)}x от нормы)`);
}

console.log('\n🎯 ИТОГОВЫЙ АНАЛИЗ ПОИСКА:');
console.log('='.repeat(70));

console.log(`📊 СТАТИСТИКА:`);
console.log(`  ├── Планировщиков найдено: ${schedulers.length}`);
console.log(`  ├── Файлов со старой логикой: ${oldLogic.length}`);
console.log(`  └── Активных процессов: ${lines ? lines.length : 0}`);

console.log(`\n📊 ПОДОЗРИТЕЛЬНЫЕ ФАЙЛЫ:`);
if (oldLogic.length > 0) {
  console.log(`  ⚠️  НАЙДЕНА СТАРАЯ ЛОГИКА в ${oldLogic.length} файлах`);
  oldLogic.forEach(file => {
    console.log(`    - ${file.path}`);
  });
} else {
  console.log(`  ✅ Старая логика не найдена`);
}

console.log(`\n📊 РЕКОМЕНДАЦИИ:`);
console.log(`  1. Проверить каждый найденный планировщик на активность`);
console.log(`  2. Убедиться что используется только UnifiedFarmingCalculator`);
console.log(`  3. Проверить логи выполнения следующего CRON`);
console.log(`  4. Найти где фактически происходят начисления +400-500 UNI`);