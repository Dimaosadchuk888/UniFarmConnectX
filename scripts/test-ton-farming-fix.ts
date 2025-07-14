/**
 * Проверка исправлений TON Farming
 */

import { BoostService } from '../modules/boost/service.js';

async function testFix() {
  console.log('\n=== ПРОВЕРКА ИСПРАВЛЕНИЙ ===\n');

  const userId = '74';
  const boostService = new BoostService();
  
  const response = await boostService.getTonBoostFarmingStatus(userId);
  
  console.log('API теперь возвращает:');
  console.log(JSON.stringify(response, null, 2));
  
  console.log('\n✅ ПРОВЕРКА ИСПРАВЛЕНИЙ:');
  
  const deposit = response.deposits[0];
  if (deposit) {
    console.log(`  - Общая сумма: ${deposit.amount} TON (ожидается 362)`);
    console.log(`  - Доход в сутки: ${response.dailyIncomeTon} TON (ожидается 3.62)`);
    console.log(`  - В секунду: ${response.totalTonRatePerSecond} TON`);
    
    // Проверка правильности значений
    const expectedAmount = 362;
    const expectedDailyIncome = 3.62;
    
    const actualAmount = parseFloat(deposit.amount);
    const actualDailyIncome = parseFloat(response.dailyIncomeTon);
    
    console.log('\n📊 РЕЗУЛЬТАТ:');
    if (Math.abs(actualAmount - expectedAmount) < 0.1) {
      console.log('  ✅ Общая сумма отображается ПРАВИЛЬНО');
    } else {
      console.log('  ❌ Общая сумма все еще неправильная');
    }
    
    if (Math.abs(actualDailyIncome - expectedDailyIncome) < 0.1) {
      console.log('  ✅ Доход рассчитывается ПРАВИЛЬНО');
    } else {
      console.log('  ❌ Доход все еще рассчитывается от полного баланса');
    }
  }
}

testFix()
  .then(() => {
    console.log('\n✅ Проверка завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });