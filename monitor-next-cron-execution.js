#!/usr/bin/env node

/**
 * МОНИТОРИНГ СЛЕДУЮЩЕГО CRON ВЫПОЛНЕНИЯ
 * Реал-тайм наблюдение за выполнением планировщика
 */

console.log('🔍 МОНИТОРИНГ СЛЕДУЮЩЕГО CRON ВЫПОЛНЕНИЯ');
console.log('='.repeat(60));

const startTime = new Date();
console.log(`⏰ Мониторинг начат: ${startTime.toLocaleTimeString()}`);

// Расчет времени до следующего CRON
const now = new Date();
const nextCron = new Date(now);
nextCron.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);
const timeToNext = nextCron.getTime() - now.getTime();
const minutesToNext = Math.floor(timeToNext / 60000);
const secondsToNext = Math.floor((timeToNext % 60000) / 1000);

console.log(`📅 Следующий CRON: ${nextCron.toLocaleTimeString()}`);
console.log(`⏳ Осталось: ${minutesToNext}м ${secondsToNext}с`);

// Получаем текущий баланс пользователя 184
let lastBalance = 278103.901397; // Из логов браузера
console.log(`💰 Текущий баланс User 184: ${lastBalance.toLocaleString()} UNI`);

console.log('\n📋 ПЛАН МОНИТОРИНГА:');
console.log('  1. Ожидание следующего CRON выполнения');
console.log('  2. Проверка изменения баланса');
console.log('  3. Анализ логов планировщика');
console.log('  4. Сравнение с ожидаемыми значениями');

// Ожидаемое изменение баланса
const expectedIncome = 0.669826; // UNI за 5 минут при интервальном режиме
console.log(`\n💡 ОЖИДАЕМОЕ ИЗМЕНЕНИЕ:`);
console.log(`  При интервальном режиме: +${expectedIncome} UNI`);
console.log(`  При накопительном режиме: +200-600 UNI (как было ранее)`);

// Функция для проверки баланса
async function checkBalance() {
  try {
    // Имитируем проверку баланса через API
    console.log(`\n🔍 [${new Date().toLocaleTimeString()}] Проверка баланса...`);
    
    // В реальности здесь был бы API запрос
    // Для диагностики симулируем ответ
    console.log(`  └── API недоступен без валидного JWT токена`);
    
    return null;
  } catch (error) {
    console.log(`  ❌ Ошибка проверки баланса: ${error.message}`);
    return null;
  }
}

// Функция для проверки логов
function checkLogs() {
  try {
    const fs = require('fs');
    console.log(`\n📄 [${new Date().toLocaleTimeString()}] Проверка логов...`);
    
    // Проверяем server_debug.log
    if (fs.existsSync('server_debug.log')) {
      const stats = fs.statSync('server_debug.log');
      const modTime = stats.mtime;
      console.log(`  server_debug.log изменен: ${modTime.toLocaleTimeString()}`);
      
      // Читаем последние 10 строк
      try {
        const { execSync } = require('child_process');
        const lastLines = execSync('tail -n 10 server_debug.log', { encoding: 'utf8' });
        const relevantLines = lastLines.split('\n').filter(line => 
          line.includes('CRON-PROTECTED') || 
          line.includes('calculateIncome') ||
          line.includes('UnifiedFarmingCalculator')
        );
        
        if (relevantLines.length > 0) {
          console.log(`  📝 Релевантные записи:`);
          relevantLines.forEach(line => {
            console.log(`    ${line}`);
          });
        } else {
          console.log(`  ⚠️  Нет записей о CRON/calculateIncome в последних 10 строках`);
        }
      } catch (e) {
        console.log(`  ❌ Ошибка чтения логов: ${e.message}`);
      }
    } else {
      console.log(`  ❌ server_debug.log не найден`);
    }
  } catch (error) {
    console.log(`  ❌ Ошибка проверки логов: ${error.message}`);
  }
}

// Мониторинг каждые 30 секунд
let monitorCount = 0;
const maxMonitorTime = 8; // 8 проверок = 4 минуты

console.log(`\n🔄 НАЧИНАЕМ МОНИТОРИНГ (каждые 30 сек):`);

const monitorInterval = setInterval(async () => {
  monitorCount++;
  const currentTime = new Date();
  
  console.log(`\n--- ПРОВЕРКА #${monitorCount} [${currentTime.toLocaleTimeString()}] ---`);
  
  // Проверяем, прошло ли время CRON
  if (currentTime >= nextCron) {
    console.log(`✅ ВРЕМЯ CRON НАСТУПИЛО! (${nextCron.toLocaleTimeString()})`);
    
    // Даем 30 секунд на выполнение планировщика
    setTimeout(() => {
      console.log(`\n🔍 ФИНАЛЬНАЯ ПРОВЕРКА ПОСЛЕ CRON:`);
      checkLogs();
      checkBalance();
      
      console.log(`\n🎯 ИТОГИ МОНИТОРИНГА:`);
      console.log(`  Время мониторинга: ${new Date().toLocaleTimeString()}`);
      console.log(`  Проверок выполнено: ${monitorCount}`);
      console.log(`  CRON время: ${nextCron.toLocaleTimeString()}`);
      
      clearInterval(monitorInterval);
      process.exit(0);
    }, 30000);
  } else {
    const remaining = Math.ceil((nextCron - currentTime) / 1000);
    console.log(`⏳ До CRON осталось: ${remaining} секунд`);
  }
  
  // Проверяем логи
  checkLogs();
  
  // Останавливаем мониторинг через 4 минуты
  if (monitorCount >= maxMonitorTime) {
    console.log(`\n⏰ МОНИТОРИНГ ЗАВЕРШЕН (максимальное время достигнуто)`);
    clearInterval(monitorInterval);
    process.exit(0);
  }
}, 30000);

// Обработка Ctrl+C
process.on('SIGINT', () => {
  console.log(`\n\n🛑 МОНИТОРИНГ ПРЕРВАН ПОЛЬЗОВАТЕЛЕМ`);
  console.log(`Выполнено проверок: ${monitorCount}`);
  clearInterval(monitorInterval);
  process.exit(0);
});

console.log(`\n💡 Нажмите Ctrl+C для остановки мониторинга`);
console.log(`⏰ Автоматическая остановка через ${maxMonitorTime * 0.5} минут`);