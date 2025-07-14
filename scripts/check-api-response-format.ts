/**
 * Проверка формата ответа API для TON Farming
 */

import { BoostService } from '../modules/boost/service.js';

async function checkApiResponse() {
  console.log('\n=== ПРОВЕРКА ОТВЕТА API ===\n');

  const userId = '74';
  const boostService = new BoostService();
  
  const response = await boostService.getTonBoostFarmingStatus(userId);
  
  console.log('API возвращает:');
  console.log(JSON.stringify(response, null, 2));
  
  console.log('\n=== АНАЛИЗ СТРУКТУРЫ DEPOSITS ===');
  if (response.deposits && response.deposits.length > 0) {
    const deposit = response.deposits[0];
    console.log('\nПоля в deposits[0]:');
    Object.keys(deposit).forEach(key => {
      console.log(`  - ${key}: "${deposit[key]}" (тип: ${typeof deposit[key]})`);
    });
    
    console.log('\n⚠️  ВНИМАНИЕ:');
    if (!deposit.ton_amount) {
      console.log('  - Поле "ton_amount" ОТСУТСТВУЕТ в ответе');
    }
    if (deposit.amount) {
      console.log('  - Поле "amount" ПРИСУТСТВУЕТ со значением:', deposit.amount);
    }
  }
}

checkApiResponse()
  .then(() => {
    console.log('\n✅ Проверка завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });