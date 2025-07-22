#!/usr/bin/env node

/**
 * ТРАССИРОВКА ВЫЗОВОВ УНИФАРМИНГ КАЛЬКУЛЯТОРА
 * Анализ того, вызывается ли calculateIncome() вообще
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 ТРАССИРОВКА ВЫЗОВОВ UNIFIED FARMING CALCULATOR');
console.log('='.repeat(60));

// 1. ПОИСК ВСЕХ ФАЙЛОВ, КОТОРЫЕ ИМПОРТИРУЮТ КАЛЬКУЛЯТОР
console.log('\n📋 1. ПОИСК ИМПОРТОВ UnifiedFarmingCalculator:');

function findImports(dir, filename) {
  const results = [];
  
  function scanDirectory(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
          scanDirectory(fullPath);
        } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('UnifiedFarmingCalculator')) {
              results.push({
                file: fullPath,
                imports: content.includes('import') && content.includes('UnifiedFarmingCalculator'),
                calls: content.includes('calculateIncome'),
                content: content
              });
            }
          } catch (e) {
            // Игнорируем ошибки чтения файлов
          }
        }
      }
    } catch (e) {
      // Игнорируем ошибки доступа к директориям
    }
  }
  
  scanDirectory(dir);
  return results;
}

const imports = findImports('.', 'UnifiedFarmingCalculator');

console.log(`  Найдено ${imports.length} файлов с упоминанием UnifiedFarmingCalculator:`);

imports.forEach((imp, index) => {
  console.log(`\n  ${index + 1}. ${imp.file}`);
  console.log(`     ├── Импортирует: ${imp.imports ? 'ДА' : 'НЕТ'}`);
  console.log(`     └── Вызывает calculateIncome: ${imp.calls ? 'ДА' : 'НЕТ'}`);
  
  // Ищем строки с вызовами
  if (imp.calls) {
    const lines = imp.content.split('\n');
    lines.forEach((line, lineNum) => {
      if (line.includes('calculateIncome')) {
        console.log(`       │ Строка ${lineNum + 1}: ${line.trim()}`);
      }
    });
  }
});

// 2. АНАЛИЗ ПЛАНИРОВЩИКА
console.log('\n📋 2. АНАЛИЗ ПЛАНИРОВЩИКА farmingScheduler.ts:');

try {
  const schedulerPath = 'core/scheduler/farmingScheduler.ts';
  const schedulerContent = fs.readFileSync(schedulerPath, 'utf8');
  
  console.log(`  ├── Файл существует: ДА`);
  console.log(`  ├── Размер файла: ${(schedulerContent.length / 1024).toFixed(1)} KB`);
  
  // Ищем ключевые паттерны
  const patterns = [
    'UnifiedFarmingCalculator',
    'calculateIncome',
    'processUniFarmingIncome',
    'cron.schedule',
    'activeFarmers'
  ];
  
  patterns.forEach(pattern => {
    const matches = (schedulerContent.match(new RegExp(pattern, 'g')) || []).length;
    console.log(`  ├── Упоминаний "${pattern}": ${matches}`);
  });
  
  // Ищем строки с вызовами калькулятора
  const lines = schedulerContent.split('\n');
  console.log(`\n  Строки с вызовами калькулятора:`);
  lines.forEach((line, lineNum) => {
    if (line.includes('calculateIncome') || line.includes('UnifiedFarmingCalculator')) {
      console.log(`    Строка ${lineNum + 1}: ${line.trim()}`);
    }
  });
  
} catch (error) {
  console.log(`  ❌ Ошибка чтения планировщика: ${error.message}`);
}

// 3. АНАЛИЗ САМОГО КАЛЬКУЛЯТОРА
console.log('\n📋 3. АНАЛИЗ UnifiedFarmingCalculator.ts:');

try {
  const calculatorPath = 'core/farming/UnifiedFarmingCalculator.ts';
  const calculatorContent = fs.readFileSync(calculatorPath, 'utf8');
  
  console.log(`  ├── Файл существует: ДА`);
  console.log(`  ├── Размер файла: ${(calculatorContent.length / 1024).toFixed(1)} KB`);
  
  // Ищем ключевую строку с интервальным режимом
  const lines = calculatorContent.split('\n');
  lines.forEach((line, lineNum) => {
    if (line.includes('UNI_FARMING_INTERVAL_MODE') || line.includes('useIntervalMode') || line.includes('effectivePeriods')) {
      console.log(`    Строка ${lineNum + 1}: ${line.trim()}`);
    }
  });
  
  // Проверяем структуру метода calculateIncome
  const calculateIncomeMatch = calculatorContent.match(/static async calculateIncome\((.*?)\): Promise<(.*?)>/);
  if (calculateIncomeMatch) {
    console.log(`  ├── Метод calculateIncome найден`);
    console.log(`  ├── Параметры: ${calculateIncomeMatch[1]}`);
    console.log(`  └── Возвращает: Promise<${calculateIncomeMatch[2]}>`);
  } else {
    console.log(`  ❌ Метод calculateIncome НЕ НАЙДЕН!`);
  }
  
} catch (error) {
  console.log(`  ❌ Ошибка чтения калькулятора: ${error.message}`);
}

// 4. ПОИСК ЛОГОВ С ВЫЗОВАМИ
console.log('\n📋 4. ПОИСК ЛОГОВ С ВЫЗОВАМИ calculateIncome:');

const logFiles = [
  'server_debug.log',
  'jwt_fix_test.log',
  'console.log',
  'app.log'
];

logFiles.forEach(logFile => {
  try {
    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.split('\n');
      const relevantLines = lines.filter(line => 
        line.includes('calculateIncome') || 
        line.includes('UnifiedFarmingCalculator') ||
        line.includes('[UNI Farming]') ||
        line.includes('CRON-PROTECTED')
      );
      
      console.log(`\n  ${logFile}:`);
      console.log(`    ├── Размер: ${(content.length / 1024).toFixed(1)} KB`);
      console.log(`    ├── Релевантных строк: ${relevantLines.length}`);
      
      if (relevantLines.length > 0) {
        console.log(`    └── Последние 5 записей:`);
        relevantLines.slice(-5).forEach((line, index) => {
          console.log(`       ${index + 1}. ${line.substring(0, 100)}...`);
        });
      } else {
        console.log(`    └── Записей о calculateIncome НЕ НАЙДЕНО`);
      }
    } else {
      console.log(`\n  ${logFile}: файл не существует`);
    }
  } catch (error) {
    console.log(`\n  ${logFile}: ошибка чтения - ${error.message}`);
  }
});

// 5. ПРОВЕРКА АКТИВНЫХ ПРОЦЕССОВ CRON
console.log('\n📋 5. ПРОВЕРКА АКТИВНОСТИ CRON ЗАДАЧ:');

try {
  const { execSync } = await import('child_process');
  
  // Проверяем процессы с cron
  try {
    const cronProcesses = execSync('ps aux | grep -E "cron|schedule" | grep -v grep', { encoding: 'utf8' });
    if (cronProcesses.trim()) {
      console.log(`  ✅ Найдены CRON процессы:`);
      cronProcesses.split('\n').forEach(line => {
        if (line.trim()) console.log(`    ${line}`);
      });
    } else {
      console.log(`  ⚠️  CRON процессы не найдены`);
    }
  } catch (e) {
    console.log(`  ⚠️  CRON процессы не найдены или ошибка: ${e.message}`);
  }
  
  // Проверяем основной процесс сервера
  try {
    const serverProcesses = execSync('ps aux | grep "server/index.ts" | grep -v grep', { encoding: 'utf8' });
    console.log(`\n  Процессы сервера:`);
    if (serverProcesses.trim()) {
      serverProcesses.split('\n').forEach(line => {
        if (line.trim()) {
          const parts = line.split(/\s+/);
          const pid = parts[1];
          const cpu = parts[2];
          const mem = parts[3];
          console.log(`    PID ${pid}: CPU ${cpu}%, MEM ${mem}%`);
        }
      });
    } else {
      console.log(`    ❌ Основной сервер НЕ НАЙДЕН!`);
    }
  } catch (e) {
    console.log(`    ❌ Ошибка поиска сервера: ${e.message}`);
  }
  
} catch (importError) {
  console.log(`  ❌ Ошибка импорта child_process: ${importError.message}`);
}

// 6. ИТОГОВЫЙ АНАЛИЗ
console.log('\n🎯 ИТОГОВЫЙ АНАЛИЗ ТРАССИРОВКИ:');
console.log('='.repeat(60));

const hasImports = imports.length > 0;
const hasCalls = imports.some(imp => imp.calls);

console.log(`📊 СТАТУС ИНТЕГРАЦИИ:`);
console.log(`  ├── Файлов с импортом: ${imports.length}`);
console.log(`  ├── Файлов с вызовами: ${imports.filter(imp => imp.calls).length}`);
console.log(`  └── Калькулятор интегрирован: ${hasImports && hasCalls ? 'ДА' : 'НЕТ'}`);

if (!hasImports) {
  console.log(`\n❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: UnifiedFarmingCalculator НЕ ИМПОРТИРУЕТСЯ!`);
} else if (!hasCalls) {
  console.log(`\n⚠️  ПРОБЛЕМА: Калькулятор импортируется, но не вызывается!`);
} else {
  console.log(`\n✅ ИНТЕГРАЦИЯ ЕСТЬ: Ищем причину неработоспособности интервального режима`);
}

console.log(`\n📋 СЛЕДУЮЩИЕ ШАГИ:`);
console.log(`  1. Проверить, выполняется ли cron задача каждые 5 минут`);
console.log(`  2. Добавить debug логирование в calculateIncome`);
console.log(`  3. Проверить значение useIntervalMode в runtime`);
console.log(`  4. Убедиться, что планировщик не блокируется distributed lock`);