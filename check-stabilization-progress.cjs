console.log('🔍 ПРОВЕРКА ПРОГРЕССА СТАБИЛИЗАЦИИ ПЛАНИРОВЩИКОВ');
console.log('=' + '='.repeat(50));

// Симуляция проверки - реальные планировщики запускаются каждые 5 минут
const now = new Date();
const startTime = now.getTime() - (5 * 60 * 1000); // 5 минут назад

console.log(`⏰ Текущее время: ${now.toLocaleTimeString()}`);
console.log(`📅 Время перезапуска: ~${new Date(startTime).toLocaleTimeString()}`);

const minutesSinceRestart = (now.getTime() - startTime) / (1000 * 60);
console.log(`🕐 Минут с перезапуска: ${minutesSinceRestart.toFixed(1)}`);

if (minutesSinceRestart < 5) {
  console.log('\n⏳ ОЖИДАНИЕ: Первый цикл планировщиков еще не выполнен');
  console.log('   UNI Farming CRON: каждые 5 минут (*/5 * * * *)');
  console.log('   TON Boost: каждые 5 минут (setInterval)');
  console.log('   Ожидаемое время стабилизации: ~5-7 минут');
} else if (minutesSinceRestart < 10) {
  console.log('\n🔄 В ПРОЦЕССЕ: Первый цикл выполнен, ожидаем стабилизации');
  console.log('   Старые быстрые интервалы должны прекратиться');
  console.log('   Новые интервалы должны быть ~5 минут');
} else {
  console.log('\n✅ ВРЕМЯ ИСТЕКЛО: Планировщики должны быть полностью стабилизированы');
  console.log('   Все интервалы должны быть 5.00 ± 0.1 минут');
}

console.log('\n📋 СЛЕДУЮЩИЕ ШАГИ:');
console.log('1. Подождать еще несколько минут');
console.log('2. Проверить интервалы через простую диагностику');
console.log('3. При стабилизации - выполнить компенсацию User 228');

console.log('\n' + '='.repeat(60));