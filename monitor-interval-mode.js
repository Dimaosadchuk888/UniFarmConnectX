#!/usr/bin/env node

/**
 * Мониторинг интервального режима UNI Farming
 * Проверяет, что система работает в правильном режиме и нет дублирующих планировщиков
 */

console.log('🔍 МОНИТОРИНГ ИНТЕРВАЛЬНОГО РЕЖИМА UNI FARMING');
console.log('='.repeat(60));

// Проверка переменной окружения
const intervalMode = process.env.UNI_FARMING_INTERVAL_MODE;
console.log(`\n📋 Переменная окружения: UNI_FARMING_INTERVAL_MODE = "${intervalMode}"`);

if (intervalMode === 'true') {
  console.log('✅ ИНТЕРВАЛЬНЫЙ РЕЖИМ АКТИВИРОВАН');
} else if (intervalMode === 'false') {
  console.log('⚠️  НАКОПИТЕЛЬНЫЙ РЕЖИМ (старая логика)');
} else {
  console.log('❌ ПЕРЕМЕННАЯ НЕ УСТАНОВЛЕНА (по умолчанию накопительный режим)');
}

// Проверка запущенных процессов
console.log('\n🔍 Проверка процессов Node.js:');
import { execSync } from 'child_process';

try {
  const processes = execSync('ps aux | grep -E "node|npm|tsx" | grep -v grep', { encoding: 'utf8' });
  const lines = processes.split('\n').filter(line => line.trim());
  
  console.log(`Найдено ${lines.length} процессов Node.js:`);
  
  let mainServer = 0;
  let duplicates = 0;
  
  lines.forEach((line, index) => {
    const parts = line.split(/\s+/);
    const pid = parts[1];
    const command = line.substring(line.indexOf(parts[10]));
    
    console.log(`  ${index + 1}. PID ${pid}: ${command}`);
    
    if (command.includes('server/index.ts') || command.includes('npm run dev')) {
      mainServer++;
    }
    
    if (command.includes('farming') || command.includes('scheduler')) {
      duplicates++;
    }
  });
  
  console.log(`\n📊 Анализ процессов:`);
  console.log(`  - Основной сервер: ${mainServer} процесс(ов)`);
  console.log(`  - Дублирующие планировщики: ${duplicates} процесс(ов)`);
  
  if (mainServer === 1) {
    console.log('✅ Нет дублирующих серверов');
  } else {
    console.log('⚠️  Обнаружены множественные серверы!');
  }
  
} catch (error) {
  console.log('❌ Ошибка проверки процессов:', error.message);
}

// Проверка логов
console.log('\n📄 Поиск логов планировщика:');
try {
  const logFiles = execSync('find . -name "*.log" -o -name "*.txt" | grep -v node_modules | head -10', { encoding: 'utf8' });
  const files = logFiles.split('\n').filter(f => f.trim());
  
  console.log(`Найдено ${files.length} лог-файлов:`);
  files.forEach(file => console.log(`  - ${file}`));
  
  // Поиск последних записей о фарминге
  if (files.length > 0) {
    console.log('\n🔍 Последние записи о фарминге:');
    try {
      const recentLogs = execSync(`tail -n 50 ${files[0]} | grep -E "UnifiedFarmingCalculator|INTERVAL|ACCUMULATIVE|farming.*income" | tail -5`, { encoding: 'utf8' });
      if (recentLogs.trim()) {
        console.log(recentLogs);
      } else {
        console.log('  Записи о фарминге не найдены в последних 50 строках');
      }
    } catch (e) {
      console.log('  Не удалось прочитать логи:', e.message);
    }
  }
  
} catch (error) {
  console.log('❌ Ошибка поиска логов:', error.message);
}

// Проверка следующего запуска планировщика
console.log('\n⏰ Время до следующего запуска планировщика:');
const now = new Date();
const nextCron = new Date(now);
nextCron.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);

const timeToNext = nextCron.getTime() - now.getTime();
const minutesToNext = Math.floor(timeToNext / 60000);
const secondsToNext = Math.floor((timeToNext % 60000) / 1000);

console.log(`  Текущее время: ${now.toISOString()}`);
console.log(`  Следующий запуск: ${nextCron.toISOString()}`);
console.log(`  Осталось: ${minutesToNext}м ${secondsToNext}с`);

console.log('\n🎯 РЕЗЮМЕ:');
console.log('='.repeat(60));

if (intervalMode === 'true') {
  console.log('✅ Интервальный режим активирован');
  console.log('✅ Система готова к равномерным начислениям');
  console.log('📋 Ожидаемое поведение: ~0.57 UNI каждые 5 минут');
} else {
  console.log('⚠️  Система работает в накопительном режиме');
  console.log('📋 Для активации интервального режима установите:');
  console.log('   UNI_FARMING_INTERVAL_MODE=true');
}

console.log('\n🔄 Для мониторинга запустите:');
console.log('   node monitor-interval-mode.js');
console.log('   watch -n 30 "node monitor-interval-mode.js"');