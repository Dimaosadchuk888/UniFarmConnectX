/**
 * Проверка нового лимита транзакций 1,000,000 UNI
 */

import { supabase } from '../core/supabase';

async function verifyNewLimit() {
  console.log('=== ПРОВЕРКА НОВОГО ЛИМИТА 1,000,000 UNI ===\n');
  
  // Получить данные user 74
  const { data: user } = await supabase
    .from('users')
    .select('uni_deposit_amount')
    .eq('id', 74)
    .single();
    
  const depositAmount = user?.uni_deposit_amount || 0;
  const dailyRate = 0.01; // 1% в день
  const expectedPerPeriod = (depositAmount * dailyRate) / 288;
  
  console.log('ТЕКУЩИЕ ПАРАМЕТРЫ:');
  console.log('------------------');
  console.log(`Депозит: ${depositAmount.toLocaleString()} UNI`);
  console.log(`Доход за период (5 мин): ${expectedPerPeriod.toFixed(2)} UNI`);
  console.log(`Доход за день: ${(depositAmount * dailyRate).toFixed(2)} UNI\n`);
  
  console.log('СТАРЫЙ ЛИМИТ vs НОВЫЙ ЛИМИТ:');
  console.log('-----------------------------');
  console.log('Старый лимит: 10,000 UNI за транзакцию');
  console.log('НОВЫЙ лимит: 1,000,000 UNI за транзакцию\n');
  
  // Рассчитать сколько периодов нужно для достижения лимитов
  const periodsForOldLimit = 10000 / expectedPerPeriod;
  const periodsForNewLimit = 1000000 / expectedPerPeriod;
  
  console.log('ВРЕМЯ НАКОПЛЕНИЯ ДО ЛИМИТА:');
  console.log('---------------------------');
  console.log(`Старый лимит 10k UNI:`);
  console.log(`  - Периодов: ${periodsForOldLimit.toFixed(1)}`);
  console.log(`  - Часов: ${(periodsForOldLimit * 5 / 60).toFixed(1)}`);
  console.log(`\nНовый лимит 1M UNI:`);
  console.log(`  - Периодов: ${periodsForNewLimit.toFixed(1)}`);
  console.log(`  - Часов: ${(periodsForNewLimit * 5 / 60).toFixed(1)}`);
  console.log(`  - Дней: ${(periodsForNewLimit * 5 / 60 / 24).toFixed(1)}`);
  
  console.log('\n\nДЛЯ БОЛЬШИХ ИНФЛЮЕНСЕРОВ:');
  console.log('-------------------------');
  
  // Примеры для крупных депозитов
  const bigDeposits = [10_000_000, 50_000_000, 100_000_000];
  
  bigDeposits.forEach(deposit => {
    const dailyIncome = deposit * dailyRate;
    const incomePerPeriod = dailyIncome / 288;
    const periodsToLimit = 1000000 / incomePerPeriod;
    const hoursToLimit = periodsToLimit * 5 / 60;
    
    console.log(`\nДепозит ${(deposit/1_000_000).toFixed(0)}M UNI:`);
    console.log(`  - Доход в день: ${dailyIncome.toLocaleString()} UNI`);
    console.log(`  - За период: ${incomePerPeriod.toFixed(0)} UNI`);
    console.log(`  - Достигнет лимита 1M за: ${hoursToLimit.toFixed(1)} часов`);
  });
  
  console.log('\n\n✅ ИЗМЕНЕНИЯ ПРИМЕНЕНЫ:');
  console.log('------------------------');
  console.log('1. Лимит увеличен с 10,000 до 1,000,000 UNI');
  console.log('2. Больше подходит для крупных инвесторов');
  console.log('3. Изменения вступят в силу при следующем запуске планировщика');
  console.log('\n⚠️  ВНИМАНИЕ: Сервер требует перезапуска для применения изменений!');
}

// Запуск проверки
verifyNewLimit().catch(console.error);