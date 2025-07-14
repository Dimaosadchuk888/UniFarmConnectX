/**
 * Проверка результата исправления отображения TON Farming
 */

import { supabase } from '../core/supabase.js';
import { BoostService } from '../modules/boost/service.js';

async function verifyFix() {
  console.log('\n=== ПРОВЕРКА ИСПРАВЛЕНИЯ TON FARMING ===\n');

  const userId = '74';
  const boostService = new BoostService();
  
  // Получаем данные из БД
  const { data: userData } = await supabase
    .from('users')
    .select('balance_ton')
    .eq('id', userId)
    .single();
    
  const { data: farmingData } = await supabase
    .from('ton_farming_data')
    .select('farming_balance')
    .eq('user_id', userId)
    .single();
  
  // Получаем данные от API
  const apiResult = await boostService.getTonBoostFarmingStatus(userId);
  const deposit = apiResult.deposits[0];
  
  console.log('📊 РЕЗУЛЬТАТЫ ПОСЛЕ ИСПРАВЛЕНИЯ:\n');
  console.log('Баланс кошелька (balance_ton):', userData?.balance_ton, 'TON');
  console.log('Сумма депозитов (farming_balance):', farmingData?.farming_balance, 'TON');
  console.log('API возвращает (amount):', deposit?.amount, 'TON');
  
  const isFixed = deposit?.amount === farmingData?.farming_balance;
  
  if (isFixed) {
    console.log('\n✅ ИСПРАВЛЕНИЕ РАБОТАЕТ!');
    console.log('   API теперь возвращает farming_balance вместо balance_ton');
    console.log('   UI будет отображать корректную сумму депозитов');
  } else {
    console.log('\n❌ ПРОБЛЕМА НЕ УСТРАНЕНА');
  }
  
  console.log('\n📈 Расчет дохода:');
  console.log('   База для расчета:', farmingData?.farming_balance, 'TON');
  console.log('   Ставка:', deposit?.rate + '% в день');
  console.log('   Доход:', (parseFloat(farmingData?.farming_balance || '0') * parseFloat(deposit?.rate || '0') / 100).toFixed(2), 'TON/день');
}

verifyFix()
  .then(() => {
    console.log('\n✅ Проверка завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });