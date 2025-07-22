import { execSync } from 'child_process';

console.log('⏰ ОЖИДАНИЕ СЛЕДУЮЩЕГО ЗАПУСКА ПЛАНИРОВЩИКА UNI FARMING');
console.log('='.repeat(60));

// Текущий баланс пользователя 184
console.log('\n📊 Текущий баланс пользователя 184:');
try {
  const curl = `curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZWxlZ3JhbUlkIjoxODQsInVzZXJuYW1lIjoiZGlhZ25vc3RpY3MiLCJyZWZDb2RlIjoiVU5JNzg0NzY4MCIsImlhdCI6MTc1MzE2ODU0NSwiZXhwIjoxNzUzNzczMzQ1fQ.2_yKGYmgvNnhwOJLBpXO7swFItZuH3F2LjJD5Sls0Is" "http://localhost:3000/api/v2/wallet/balance?user_id=184"`;
  const balance = execSync(curl, { encoding: 'utf8' });
  console.log('  Баланс UNI:', JSON.parse(balance).data?.uniBalance || 'N/A');
} catch (e) {
  console.log('  Не удалось получить баланс:', e.message);
}

// Функция для ожидания следующего cron запуска
function waitForNextCron() {
  const now = new Date();
  const nextCron = new Date(now);
  nextCron.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);
  
  const timeToNext = nextCron.getTime() - now.getTime();
  const minutesToNext = Math.floor(timeToNext / 60000);
  const secondsToNext = Math.floor((timeToNext % 60000) / 1000);
  
  console.log(`\n⏱️  Время до следующего запуска: ${minutesToNext}м ${secondsToNext}с`);
  console.log(`   Следующий запуск: ${nextCron.toLocaleTimeString()}`);
  
  return timeToNext;
}

// Проверка интервального режима
console.log('\n🔍 Проверка режима:');
console.log(`   UNI_FARMING_INTERVAL_MODE = "${process.env.UNI_FARMING_INTERVAL_MODE}"`);

if (process.env.UNI_FARMING_INTERVAL_MODE === 'true') {
  console.log('✅ ИНТЕРВАЛЬНЫЙ РЕЖИМ АКТИВЕН');
  console.log('📋 Ожидаемое начисление: ~0.57 UNI за интервал');
} else {
  console.log('⚠️  НАКОПИТЕЛЬНЫЙ РЕЖИМ');
}

console.log('\n🎯 Мониторинг запущен...');
console.log('📝 После запуска планировщика проверьте логи с помощью:');
console.log('   tail -f server_debug.log | grep -E "UnifiedFarmingCalculator|INTERVAL|Income calculated"');

waitForNextCron();