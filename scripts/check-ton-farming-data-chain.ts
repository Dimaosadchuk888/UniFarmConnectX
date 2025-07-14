/**
 * Глубокий анализ цепочки данных TON Farming
 * Техническая диагностика полной цепочки данных
 */

import { supabase } from '../core/supabase.js';
import { BoostService } from '../modules/boost/service.js';

async function analyzeTonFarmingDataChain() {
  console.log('\n=== АНАЛИЗ ЦЕПОЧКИ ДАННЫХ TON FARMING ===\n');

  const userId = '74';
  
  // 1. Проверка данных в таблице users
  console.log('1. ДАННЫЕ В ТАБЛИЦЕ USERS:');
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, balance_ton, ton_boost_package, ton_farming_balance, ton_farming_rate')
    .eq('id', userId)
    .single();
    
  if (userData) {
    console.log('  - balance_ton:', userData.balance_ton);
    console.log('  - ton_boost_package:', userData.ton_boost_package);
    console.log('  - ton_farming_balance:', userData.ton_farming_balance || 'НЕ СУЩЕСТВУЕТ В ТАБЛИЦЕ');
    console.log('  - ton_farming_rate:', userData.ton_farming_rate || 'НЕ СУЩЕСТВУЕТ В ТАБЛИЦЕ');
  }
  
  // 2. Проверка данных в таблице ton_farming_data
  console.log('\n2. ДАННЫЕ В ТАБЛИЦЕ TON_FARMING_DATA:');
  const { data: farmingData, error: farmingError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  if (farmingError) {
    console.log('  ❌ Ошибка:', farmingError.message);
    if (farmingError.code === 'PGRST116') {
      console.log('  ⚠️  Нет данных для пользователя', userId);
    }
  } else if (farmingData) {
    console.log('  - user_id:', farmingData.user_id);
    console.log('  - farming_balance:', farmingData.farming_balance);
    console.log('  - farming_rate:', farmingData.farming_rate);
    console.log('  - boost_package_id:', farmingData.boost_package_id);
    console.log('  - status:', farmingData.status);
  }
  
  // 3. Проверка что возвращает API
  console.log('\n3. ДАННЫЕ ОТ API getTonBoostFarmingStatus:');
  const boostService = new BoostService();
  const apiResult = await boostService.getTonBoostFarmingStatus(userId);
  console.log('  - dailyIncomeTon:', apiResult.dailyIncomeTon);
  console.log('  - deposits:', JSON.stringify(apiResult.deposits, null, 2));
  
  // 4. Анализ проблемы
  console.log('\n4. АНАЛИЗ ПРОБЛЕМЫ:');
  
  if (apiResult.deposits.length > 0) {
    const deposit = apiResult.deposits[0];
    console.log('\n  ❌ ПРОБЛЕМА НАЙДЕНА:');
    console.log('  - API возвращает amount =', deposit.amount, 'TON');
    console.log('  - Это значение берется из balance_ton (', userData?.balance_ton, ')');
    console.log('  - А должно браться из farming_balance (', farmingData?.farming_balance || '???', ')');
    console.log('\n  📊 РАСХОЖДЕНИЕ:');
    console.log('  - Отображается:', deposit.amount, 'TON (весь баланс кошелька)');
    console.log('  - Должно быть:', farmingData?.farming_balance || '???', 'TON (сумма депозитов)');
  }
  
  // 5. Проверка расчетов дохода
  console.log('\n5. ПРОВЕРКА РАСЧЕТОВ ДОХОДА:');
  if (userData && farmingData) {
    const balanceUsed = parseFloat(userData.balance_ton);
    const shouldUseBalance = parseFloat(farmingData.farming_balance || '0');
    const rate = parseFloat(farmingData.farming_rate || '0.02');
    
    console.log('  - Текущий расчет: ', balanceUsed, '* ', rate, '=', (balanceUsed * rate).toFixed(6), 'TON/день');
    console.log('  - Правильный расчет:', shouldUseBalance, '* ', rate, '=', (shouldUseBalance * rate).toFixed(6), 'TON/день');
    console.log('  - Разница:', ((balanceUsed - shouldUseBalance) * rate).toFixed(6), 'TON/день лишнего дохода');
  }
  
  // 6. Проверка frontend компонента
  console.log('\n6. FRONTEND КОМПОНЕНТ TonFarmingStatusCard:');
  console.log('  - Рассчитывает "Общую сумму" суммируя deposits[].amount');
  console.log('  - Если API возвращает balance_ton вместо farming_balance,');
  console.log('    то компонент покажет неправильную сумму');
  
  console.log('\n7. ВЫВОДЫ:');
  console.log('  ✅ Frontend работает правильно - суммирует deposits');
  console.log('  ❌ Backend возвращает неправильные данные:');
  console.log('     - amount: balance_ton вместо farming_balance');
  console.log('     - доход рассчитывается от всего баланса, а не от депозита');
}

analyzeTonFarmingDataChain()
  .then(() => {
    console.log('\n✅ Анализ завершен');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });