/**
 * Проверка формата API ответа
 */

import { BoostService } from '../modules/boost/service.js';

async function checkApiFormat() {
  console.log('\n=== ПРОВЕРКА API ОТВЕТА ===\n');

  const userId = '74';
  const boostService = new BoostService();
  
  try {
    const response = await boostService.getTonBoostFarmingStatus(userId);
    
    console.log('API возвращает:');
    console.log(JSON.stringify(response, null, 2));
    
    console.log('\n📊 АНАЛИЗ:');
    console.log(`- Доход в сутки (dailyIncomeTon): ${response.dailyIncomeTon} TON`);
    console.log(`- Доход в секунду (totalTonRatePerSecond): ${response.totalTonRatePerSecond} TON`);
    
    if (response.deposits && response.deposits[0]) {
      console.log(`- Сумма депозита: ${response.deposits[0].amount} TON`);
      console.log(`- Ставка: ${response.deposits[0].rate}%`);
      
      // Проверка математики
      const depositAmount = parseFloat(response.deposits[0].amount);
      const rate = parseFloat(response.deposits[0].rate);
      const expectedDailyIncome = (depositAmount * rate) / 100;
      
      console.log(`\n✅ ПРОВЕРКА МАТЕМАТИКИ:`);
      console.log(`  ${depositAmount} TON × ${rate}% = ${expectedDailyIncome} TON в день`);
      console.log(`  Ожидается: ${expectedDailyIncome} TON`);
      console.log(`  Получено: ${response.dailyIncomeTon} TON`);
      
      if (Math.abs(parseFloat(response.dailyIncomeTon) - expectedDailyIncome) < 0.01) {
        console.log(`  ✅ Расчет ПРАВИЛЬНЫЙ!`);
      } else {
        console.log(`  ❌ Расчет НЕПРАВИЛЬНЫЙ!`);
      }
    }
    
    // Проверяем, какие поля есть в deposits
    if (response.deposits && response.deposits[0]) {
      console.log('\n🔍 ПОЛЯ В deposits[0]:');
      Object.keys(response.deposits[0]).forEach(key => {
        console.log(`  - ${key}: ${response.deposits[0][key]}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkApiFormat()
  .then(() => {
    console.log('\n✅ Проверка завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });