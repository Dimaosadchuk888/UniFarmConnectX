#!/usr/bin/env node

/**
 * ДИАГНОСТИКА ПЛАНИРОВЩИКА UNI FARMING
 * Проверка корректности работы без изменения кода
 */

import { execSync } from 'child_process';

console.log('🔍 ДИАГНОСТИКА ПЛАНИРОВЩИКА UNI FARMING');
console.log('='.repeat(60));

// 1. ПРОВЕРКА ПРОЦЕССОВ ПЛАНИРОВЩИКА
console.log('\n📋 1. АНАЛИЗ АКТИВНЫХ ПЛАНИРОВЩИКОВ:');

try {
  const processes = execSync('ps aux | grep -E "node|tsx|npm" | grep -v grep', { encoding: 'utf8' });
  const lines = processes.split('\n').filter(line => line.trim());
  
  let farmingProcesses = 0;
  let mainServer = 0;
  
  console.log(`Найдено ${lines.length} Node.js процессов:`);
  
  lines.forEach((line, index) => {
    const parts = line.split(/\s+/);
    const pid = parts[1];
    const command = line.substring(line.indexOf(parts[10]));
    
    if (command.includes('server/index.ts')) {
      mainServer++;
      console.log(`  ✅ Основной сервер: PID ${pid}`);
    } else if (command.includes('farming') || command.includes('scheduler')) {
      farmingProcesses++;
      console.log(`  ⚠️  Планировщик: PID ${pid} - ${command}`);
    } else {
      console.log(`  📝 Процесс: PID ${pid} - ${command.substring(0, 80)}...`);
    }
  });
  
  console.log(`\n📊 Итого:`);
  console.log(`  - Основных серверов: ${mainServer}`);
  console.log(`  - Планировщиков фарминга: ${farmingProcesses}`);
  
  if (farmingProcesses === 0) {
    console.log(`  ✅ Дублирующих планировщиков НЕТ`);
  } else {
    console.log(`  ⚠️  Обнаружены отдельные планировщики!`);
  }
  
} catch (error) {
  console.log(`❌ Ошибка анализа процессов: ${error.message}`);
}

// 2. ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ
console.log('\n📋 2. ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ:');
const intervalMode = process.env.UNI_FARMING_INTERVAL_MODE;
console.log(`  UNI_FARMING_INTERVAL_MODE = "${intervalMode}"`);

if (intervalMode === 'true') {
  console.log('  ✅ ИНТЕРВАЛЬНЫЙ РЕЖИМ (ограничение 1 период)');
} else {
  console.log('  ⚠️  НАКОПИТЕЛЬНЫЙ РЕЖИМ (до 288 периодов)');
}

// 3. РАСЧЕТ ОЖИДАЕМЫХ НАЧИСЛЕНИЙ
console.log('\n📋 3. РАСЧЕТ ОЖИДАЕМЫХ НАЧИСЛЕНИЙ:');

const currentData = {
  userId: 184,
  uniDepositAmount: 19291,
  currentBalance: 277247.307405  // Последний баланс из логов
};

// Формула из кода: 1% в день
const DAILY_RATE = 0.01;
const PERIODS_PER_DAY = 288; // 24 часа * 12 интервалов по 5 минут

const dailyIncome = currentData.uniDepositAmount * DAILY_RATE;
const incomePerPeriod = dailyIncome / PERIODS_PER_DAY;

console.log(`  Депозит: ${currentData.uniDepositAmount.toLocaleString()} UNI`);
console.log(`  Дневной доход (1%): ${dailyIncome.toFixed(2)} UNI`);
console.log(`  Доход за 5 минут: ${incomePerPeriod.toFixed(6)} UNI`);
console.log(`  Доход за час: ${(incomePerPeriod * 12).toFixed(4)} UNI`);

// 4. АНАЛИЗ ФАКТИЧЕСКИХ НАЧИСЛЕНИЙ
console.log('\n📋 4. АНАЛИЗ ФАКТИЧЕСКИХ ИЗМЕНЕНИЙ БАЛАНСА:');

// Данные из логов браузера (последние обновления)
const balanceChanges = [
  { time: '09:26', balance: 276043.577405, change: 0 },
  { time: '09:28', balance: 276459.397405, change: 415.82 },
  { time: '09:31', balance: 276679.397405, change: 220.0 },
  { time: '09:35', balance: 277247.307405, change: 567.91 }
];

console.log('  Последние изменения баланса:');
balanceChanges.forEach((change, index) => {
  if (index > 0) {
    const diff = change.balance - balanceChanges[index-1].balance;
    const ratio = (diff / incomePerPeriod).toFixed(1);
    console.log(`    ${change.time}: +${diff.toFixed(2)} UNI (${ratio}x от ожидаемого)`);
  } else {
    console.log(`    ${change.time}: ${change.balance.toFixed(2)} UNI (базовая точка)`);
  }
});

// 5. ВРЕМЯ ДО СЛЕДУЮЩЕГО ПЛАНИРОВЩИКА
console.log('\n📋 5. РАСПИСАНИЕ ПЛАНИРОВЩИКА:');

const now = new Date();
const nextCron = new Date(now);
nextCron.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);

const timeToNext = nextCron.getTime() - now.getTime();
const minutesToNext = Math.floor(timeToNext / 60000);
const secondsToNext = Math.floor((timeToNext % 60000) / 1000);

console.log(`  Текущее время: ${now.toLocaleTimeString()}`);
console.log(`  Следующий запуск: ${nextCron.toLocaleTimeString()}`);
console.log(`  Осталось: ${minutesToNext}м ${secondsToNext}с`);

// 6. ПРОВЕРКА ЛОГОВ
console.log('\n📋 6. ПОИСК ЛОГОВ ПЛАНИРОВЩИКА:');

try {
  // Ищем логи за последние 10 минут
  const recentLogs = execSync('find . -name "*.log" -o -name "*.txt" | grep -v node_modules | head -5', { encoding: 'utf8' });
  const logFiles = recentLogs.split('\n').filter(f => f.trim());
  
  console.log(`  Найдено ${logFiles.length} лог-файлов`);
  
  if (logFiles.length > 0) {
    try {
      const farmingLogs = execSync(`tail -n 100 ${logFiles[0]} | grep -E "UnifiedFarmingCalculator|farming.*income|cron.*farming" | tail -10`, { encoding: 'utf8' });
      
      if (farmingLogs.trim()) {
        console.log('  📄 Последние записи о фарминге:');
        farmingLogs.split('\n').forEach(log => {
          if (log.trim()) console.log(`    ${log}`);
        });
      } else {
        console.log('  ⚠️  Записи о UNI Farming не найдены');
      }
    } catch (e) {
      console.log(`  ❌ Не удалось прочитать логи: ${e.message}`);
    }
  }
} catch (error) {
  console.log(`  ❌ Ошибка поиска логов: ${error.message}`);
}

// 7. ИТОГОВЫЙ АНАЛИЗ
console.log('\n🎯 ИТОГОВЫЙ АНАЛИЗ:');
console.log('='.repeat(60));

const expectedIncome = incomePerPeriod;
const lastActualIncome = 567.91; // Последнее увеличение баланса
const ratio = lastActualIncome / expectedIncome;

console.log(`📊 СРАВНЕНИЕ:`);
console.log(`  Ожидаемое начисление: ${expectedIncome.toFixed(6)} UNI`);
console.log(`  Фактическое изменение: ${lastActualIncome} UNI`);
console.log(`  Соотношение: ${ratio.toFixed(1)}x`);

if (ratio > 100) {
  console.log(`  ❌ ПРОБЛЕМА: Начисления в ${ratio.toFixed(0)} раз больше нормы!`);
  if (intervalMode !== 'true') {
    console.log(`  💡 ПРИЧИНА: Накопительный режим активен`);
  } else {
    console.log(`  💡 ВОЗМОЖНАЯ ПРИЧИНА: Интервальный режим не работает`);
  }
} else if (ratio > 10) {
  console.log(`  ⚠️  ВНИМАНИЕ: Начисления превышают норму в ${ratio.toFixed(1)} раз`);
} else if (ratio >= 0.8 && ratio <= 1.2) {
  console.log(`  ✅ НОРМА: Начисления соответствуют ожидаемым`);
} else if (ratio < 0.1) {
  console.log(`  ❌ ПРОБЛЕМА: Начисления слишком малы или отсутствуют`);
}

console.log(`\n🔍 РЕКОМЕНДАЦИИ:`);

if (intervalMode !== 'true') {
  console.log(`  1. Интервальный режим НЕ активен - ожидайте больших начислений`);
} else {
  console.log(`  1. Интервальный режим активен - ожидайте стабильные начисления`);
}

console.log(`  2. Следующее начисление ожидается в ${nextCron.toLocaleTimeString()}`);
console.log(`  3. Для мониторинга: watch -n 30 "node diagnose-unifarming-scheduler.js"`);

console.log(`\n📋 СТАТУС: ${intervalMode === 'true' ? 'ИНТЕРВАЛЬНЫЙ РЕЖИМ' : 'НАКОПИТЕЛЬНЫЙ РЕЖИМ'}`);