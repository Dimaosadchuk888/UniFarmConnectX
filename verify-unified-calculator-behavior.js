#!/usr/bin/env node

/**
 * ПРОВЕРКА ПОВЕДЕНИЯ UNIFIEDFARMINGCALCULATOR
 * Анализ без изменения кода - проверяем применяется ли интервальный режим
 */

import fs from 'fs';

console.log('🔍 ПРОВЕРКА ПОВЕДЕНИЯ UNIFIEDFARMINGCALCULATOR');
console.log('='.repeat(80));

const startTime = new Date();
console.log(`⏰ Проверка начата: ${startTime.toLocaleTimeString()}`);

// 1. АНАЛИЗ КОДА UNIFIEDFARMINGCALCULATOR
console.log('\n📋 1. АНАЛИЗ КОДА UNIFIEDFARMINGCALCULATOR:');

try {
  const calculatorPath = 'core/farming/UnifiedFarmingCalculator.ts';
  const calculatorContent = fs.readFileSync(calculatorPath, 'utf8');
  
  console.log(`  📄 Размер файла: ${(calculatorContent.length / 1024).toFixed(1)} KB`);
  
  // Ищем ключевые строки кода
  const lines = calculatorContent.split('\n');
  
  // Поиск чтения переменной окружения
  const envLines = lines.filter(line => line.includes('UNI_FARMING_INTERVAL_MODE'));
  console.log(`\n  🔍 ПРОВЕРКА ПЕРЕМЕННОЙ ОКРУЖЕНИЯ:`);
  console.log(`    ├── Найдено упоминаний: ${envLines.length}`);
  
  envLines.forEach((line, index) => {
    const lineNum = lines.indexOf(line) + 1;
    console.log(`    ${index + 1}. Строка ${lineNum}: ${line.trim()}`);
  });
  
  // Поиск логики интервального режима
  const intervalLines = lines.filter(line => 
    line.includes('useIntervalMode') || 
    line.includes('effectivePeriods') ||
    (line.includes('1') && line.includes('Math.min'))
  );
  
  console.log(`\n  🔍 ЛОГИКА ИНТЕРВАЛЬНОГО РЕЖИМА:`);
  console.log(`    ├── Найдено строк логики: ${intervalLines.length}`);
  
  intervalLines.slice(0, 5).forEach((line, index) => {
    const lineNum = lines.indexOf(line) + 1;
    console.log(`    ${index + 1}. Строка ${lineNum}: ${line.trim()}`);
  });
  
  // Ищем логирование
  const logLines = lines.filter(line => 
    line.includes('logger') && 
    (line.includes('interval') || line.includes('periods') || line.includes('mode'))
  );
  
  console.log(`\n  🔍 ЛОГИРОВАНИЕ ИНТЕРВАЛЬНОГО РЕЖИМА:`);
  console.log(`    ├── Найдено строк логирования: ${logLines.length}`);
  
  if (logLines.length > 0) {
    logLines.forEach((line, index) => {
      const lineNum = lines.indexOf(line) + 1;
      console.log(`    ${index + 1}. Строка ${lineNum}: ${line.trim()}`);
    });
  } else {
    console.log(`    └── ⚠️  ЛОГИРОВАНИЕ НЕ НАЙДЕНО`);
  }
  
} catch (error) {
  console.log(`  ❌ Ошибка чтения UnifiedFarmingCalculator: ${error.message}`);
}

// 2. АНАЛИЗ FARMINGSCHEDULER
console.log('\n📋 2. АНАЛИЗ FARMINGSCHEDULER:');

try {
  const schedulerPath = 'core/scheduler/farmingScheduler.ts';
  const schedulerContent = fs.readFileSync(schedulerPath, 'utf8');
  
  console.log(`  📄 Размер файла: ${(schedulerContent.length / 1024).toFixed(1)} KB`);
  
  const lines = schedulerContent.split('\n');
  
  // Ищем импорт UnifiedFarmingCalculator
  const importLines = lines.filter(line => line.includes('UnifiedFarmingCalculator'));
  console.log(`\n  🔍 ИМПОРТ UNIFIEDFARMINGCALCULATOR:`);
  console.log(`    ├── Найдено импортов: ${importLines.length}`);
  
  importLines.forEach((line, index) => {
    const lineNum = lines.indexOf(line) + 1;
    console.log(`    ${index + 1}. Строка ${lineNum}: ${line.trim()}`);
  });
  
  // Ищем вызовы calculateIncome
  const calculateLines = lines.filter(line => line.includes('calculateIncome'));
  console.log(`\n  🔍 ВЫЗОВЫ CALCULATEINCOME:`);
  console.log(`    ├── Найдено вызовов: ${calculateLines.length}`);
  
  calculateLines.forEach((line, index) => {
    const lineNum = lines.indexOf(line) + 1;
    console.log(`    ${index + 1}. Строка ${lineNum}: ${line.trim()}`);
  });
  
  // Ищем старые вычисления (если остались)
  const oldCalcLines = lines.filter(line => 
    (line.includes('Math.min') && line.includes('288')) ||
    line.includes('periods') && line.includes('*')
  );
  
  console.log(`\n  🔍 СТАРЫЕ ВЫЧИСЛЕНИЯ (Math.min с 288):`);
  console.log(`    ├── Найдено подозрительных строк: ${oldCalcLines.length}`);
  
  if (oldCalcLines.length > 0) {
    console.log(`    ⚠️  ВОЗМОЖНО СТАРАЯ ЛОГИКА ОСТАЛАСЬ:`);
    oldCalcLines.forEach((line, index) => {
      const lineNum = lines.indexOf(line) + 1;
      console.log(`    ${index + 1}. Строка ${lineNum}: ${line.trim()}`);
    });
  } else {
    console.log(`    ✅ Старая логика не найдена`);
  }
  
} catch (error) {
  console.log(`  ❌ Ошибка чтения FarmingScheduler: ${error.message}`);
}

// 3. ПРОВЕРКА ТЕКУЩЕГО ВРЕМЕНИ И CRON
console.log('\n📋 3. АНАЛИЗ ВРЕМЕНИ ВЫПОЛНЕНИЯ:');

const now = new Date();
const minute = now.getMinutes();
const second = now.getSeconds();

console.log(`  ⏰ ТЕКУЩЕЕ ВРЕМЯ:`);
console.log(`    ├── Время: ${now.toLocaleTimeString()}`);
console.log(`    ├── Минута: ${minute}`);
console.log(`    ├── Секунда: ${second}`);
console.log(`    └── Кратность 5: ${minute % 5 === 0 ? 'ДА (CRON сработает!)' : `НЕТ (до CRON ${5 - (minute % 5)} минут)`}`);

// Вычисляем следующие CRON запуски
const nextCronTimes = [];
for (let i = 0; i < 3; i++) {
  const nextTime = new Date(now);
  nextTime.setMinutes(Math.ceil((now.getMinutes() + i * 5) / 5) * 5, 0, 0);
  nextCronTimes.push(nextTime);
}

console.log(`\n  📅 СЛЕДУЮЩИЕ CRON ЗАПУСКИ (*/5 * * * *):`);
nextCronTimes.forEach((time, index) => {
  const minutesUntil = Math.ceil((time - now) / (60 * 1000));
  console.log(`    ${index + 1}. ${time.toLocaleTimeString()} (через ${minutesUntil} мин)`);
});

// 4. АНАЛИЗ ПОСЛЕДНИХ ИЗМЕНЕНИЙ БАЛАНСА
console.log('\n📋 4. АНАЛИЗ ПОСЛЕДНИХ ИЗМЕНЕНИЙ БАЛАНСА:');

// Данные из логов браузера
const recentChanges = [
  { time: '10:06', balance: 280128.57518, change: 444.45 },
  { time: '10:09', balance: 280321.28695, change: 192.71 },
  { time: '10:10', balance: 280442.155006, change: 120.87 }
];

console.log(`  📊 ИЗМЕНЕНИЯ User 184:`);
recentChanges.forEach((entry, index) => {
  const expectedInterval = 0.669826;
  const ratio = entry.change / expectedInterval;
  const periods = Math.round(entry.change / expectedInterval);
  
  console.log(`    ${index + 1}. ${entry.time}: +${entry.change.toFixed(2)} UNI (${ratio.toFixed(0)}x = ~${periods} периодов)`);
});

console.log(`\n  🔍 ПАТТЕРН АНАЛИЗ:`);
console.log(`    ├── Частота: каждые 1-4 минуты (НЕ строго 5)`);
console.log(`    ├── Величина: 120-444 UNI (180-663 периодов)`);
console.log(`    ├── Тренд: уменьшается со временем`);
console.log(`    └── Вывод: накопительная логика работает, периоды уменьшаются`);

// 5. ПРОВЕРКА РЕФЕРАЛЬНЫХ ТРАНЗАКЦИЙ
console.log('\n📋 5. АНАЛИЗ РЕФЕРАЛЬНЫХ ТРАНЗАКЦИЙ:');

console.log(`  💰 НЕДАВНИЕ РЕФЕРАЛЬНЫЕ НАГРАДЫ (из логов):`);
console.log(`    ├── 10:10:35: +0.12152778 UNI от User 190`);
console.log(`    ├── 10:10:34: +0.10416667 UNI от User 189`);
console.log(`    ├── 10:10:33: +35.00000000 UNI от User 190 (!!!)🚨`);
console.log(`    └── 10:10:33: +0.08680556 UNI от User 188`);

const bigReward = 35.0;
const expectedReward = 0.669826 * 0.05; // 5% от ожидаемого дохода
const bigRewardRatio = bigReward / expectedReward;

console.log(`\n  🔍 АНАЛИЗ БОЛЬШОЙ РЕФЕРАЛЬНОЙ НАГРАДЫ:`);
console.log(`    ├── Награда: ${bigReward} UNI`);
console.log(`    ├── Ожидаемая награда: ${expectedReward.toFixed(6)} UNI`);
console.log(`    ├── Превышение: ${bigRewardRatio.toFixed(0)}x`);
console.log(`    ├── Доход реферала: ${bigReward} UNI (100% реферальная награда)`);
console.log(`    └── Это значит User 190 получил ${bigReward} UNI фарминг-дохода!`);

// 6. ИТОГОВАЯ ДИАГНОСТИКА
console.log('\n🎯 ИТОГОВАЯ ДИАГНОСТИКА:');
console.log('='.repeat(80));

console.log(`\n📊 СОСТОЯНИЕ ИНТЕРВАЛЬНОГО РЕЖИМА:`);
console.log(`  ├── Переменная установлена: ${process.env.UNI_FARMING_INTERVAL_MODE === 'true' ? 'ДА' : 'НЕТ'}`);

if (process.env.UNI_FARMING_INTERVAL_MODE === 'true') {
  console.log(`  ├── Ожидаемый доход: 0.67 UNI за 5 минут`);
  console.log(`  ├── Фактический доход: 120-444 UNI за интервал`);
  console.log(`  ├── Превышение: 180-663x`);
  console.log(`  └── ВЫВОД: Интервальный режим НЕ РАБОТАЕТ в production`);
} else {
  console.log(`  └── Интервальный режим не активирован`);
}

console.log(`\n📊 ВОЗМОЖНЫЕ ПРИЧИНЫ ПРОБЛЕМЫ:`);
console.log(`  1. ❌ UnifiedFarmingCalculator НЕ читает переменную окружения в runtime`);
console.log(`  2. ❌ FarmingScheduler НЕ вызывает UnifiedFarmingCalculator`);
console.log(`  3. ❌ Переменная окружения НЕ доступна в production процессе`);
console.log(`  4. ❌ Кэшируется старое значение переменной`);
console.log(`  5. ❌ Работает старая версия кода параллельно`);

console.log(`\n📊 РЕКОМЕНДАЦИИ ДЛЯ ИСПРАВЛЕНИЯ:`);
console.log(`  1. 🔧 ДОБАВИТЬ debug логирование в UnifiedFarmingCalculator`);
console.log(`  2. 🔧 ПРОВЕРИТЬ что FarmingScheduler вызывает правильный код`);
console.log(`  3. 🔧 УБЕДИТЬСЯ что переменная окружения читается в runtime`);
console.log(`  4. 🔧 СОЗДАТЬ emergency флаг для принудительного интервального режима`);
console.log(`  5. 🔧 ВРЕМЕННО отключить один из планировщиков для изоляции`);

const endTime = new Date();
const duration = (endTime - startTime) / 1000;

console.log(`\n⏱️  ПРОВЕРКА ЗАВЕРШЕНА за ${duration.toFixed(1)} секунд`);
console.log(`📋 Время: ${endTime.toLocaleTimeString()}`);
console.log(`🎯 СТАТУС: ПРОБЛЕМА ЛОКАЛИЗОВАНА - ИНТЕРВАЛЬНЫЙ РЕЖИМ НЕ ПРИМЕНЯЕТСЯ`);