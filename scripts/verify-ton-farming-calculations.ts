/**
 * Проверка правильности начислений TON Farming
 */

import { supabase } from '../core/supabase.js';

async function verifyCalculations() {
  console.log('\n=== ПРОВЕРКА НАЧИСЛЕНИЙ TON FARMING ===\n');

  const userId = 74;
  
  // 1. Проверяем данные в ton_farming_data
  const { data: farmingData, error: farmingError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (farmingError) {
    console.error('Ошибка получения данных фарминга:', farmingError);
    return;
  }

  console.log('📊 Данные из ton_farming_data:');
  console.log(`- User ID: ${farmingData.user_id}`);
  console.log(`- Farming Balance: ${farmingData.farming_balance} TON`);
  console.log(`- Farming Rate: ${farmingData.farming_rate * 100}% в день`);
  console.log(`- Boost Package ID: ${farmingData.boost_package_id}`);
  console.log(`- Status: ${farmingData.status}`);
  
  // 2. Проверяем количество депозитов в boost_purchases
  const { data: purchases, error: purchasesError } = await supabase
    .from('boost_purchases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!purchasesError && purchases) {
    console.log(`\n📦 Всего покупок TON Boost: ${purchases.length}`);
    
    // Считаем активные депозиты
    const activeDeposits = purchases.filter(p => 
      new Date(p.end_date) > new Date() && 
      p.status === 'confirmed'
    );
    
    console.log(`- Активных депозитов: ${activeDeposits.length}`);
    
    // Показываем детали депозитов
    activeDeposits.forEach((deposit, index) => {
      console.log(`\n  Депозит ${index + 1}:`);
      console.log(`  - Boost ID: ${deposit.boost_id}`);
      console.log(`  - Дата начала: ${deposit.start_date}`);
      console.log(`  - Дата окончания: ${deposit.end_date}`);
      console.log(`  - Статус: ${deposit.status}`);
    });
  }

  // 3. Рассчитываем правильность начислений
  const depositAmount = parseFloat(farmingData.farming_balance || 0);
  const dailyRate = parseFloat(farmingData.farming_rate || 0);
  
  console.log('\n💰 РАСЧЕТ НАЧИСЛЕНИЙ:');
  console.log(`- Сумма депозита: ${depositAmount} TON`);
  console.log(`- Ставка в день: ${dailyRate * 100}%`);
  
  const dailyIncome = depositAmount * dailyRate;
  const hourlyIncome = dailyIncome / 24;
  const incomePerMinute = hourlyIncome / 60;
  const incomePer5Minutes = incomePerMinute * 5;
  
  console.log(`\n✅ Доход:`);
  console.log(`- В день: ${dailyIncome.toFixed(6)} TON`);
  console.log(`- В час: ${hourlyIncome.toFixed(6)} TON`);
  console.log(`- За 5 минут: ${incomePer5Minutes.toFixed(6)} TON`);
  
  console.log(`\n📊 ПРОВЕРКА:`);
  console.log(`Вы получаете: 0.012569 TON за 5 минут`);
  console.log(`Должны получать: ${incomePer5Minutes.toFixed(6)} TON за 5 минут`);
  
  const difference = Math.abs(0.012569 - incomePer5Minutes);
  if (difference < 0.000001) {
    console.log(`✅ Начисления ПРАВИЛЬНЫЕ!`);
  } else {
    console.log(`❌ Есть расхождение: ${difference.toFixed(6)} TON`);
  }

  // 4. Проверяем последние транзакции
  const { data: lastTransactions, error: transError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!transError && lastTransactions) {
    console.log(`\n📜 Последние 5 начислений TON:`);
    lastTransactions.forEach((tx, index) => {
      const date = new Date(tx.created_at);
      console.log(`${index + 1}. ${date.toLocaleTimeString('ru-RU')}: +${parseFloat(tx.amount).toFixed(6)} TON`);
    });
  }
}

verifyCalculations()
  .then(() => {
    console.log('\n✅ Проверка завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });