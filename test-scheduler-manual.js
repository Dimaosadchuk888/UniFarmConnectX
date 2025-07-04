/**
 * Ручной запуск планировщика TON Boost для тестирования
 */

import { createClient } from '@supabase/supabase-js';

async function testSchedulerManual() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('=== РУЧНОЙ ТЕСТ ПЛАНИРОВЩИКА TON BOOST ===');
  
  // 1. Найдем пользователей с активными TON Boost пакетами
  console.log('\n1. ПОИСК АКТИВНЫХ ПОЛЬЗОВАТЕЛЕЙ:');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, balance_ton, ton_boost_package, ton_boost_rate')
    .not('ton_boost_package', 'is', null)
    .neq('ton_boost_package', 0)
    .gte('balance_ton', 10);
  
  if (usersError) {
    console.log('   ❌ Ошибка:', usersError.message);
    return;
  }
  
  console.log(`   ✅ Найдено ${users.length} активных пользователей:`, users);
  
  if (users.length === 0) {
    console.log('   ⚠️ Нет пользователей для обработки');
    return;
  }
  
  // 2. Эмуляция работы планировщика для каждого пользователя
  console.log('\n2. ЭМУЛЯЦИЯ ПЛАНИРОВЩИКА:');
  
  for (const user of users) {
    console.log(`\n   Обработка User ${user.id}:`);
    console.log(`   - Баланс TON: ${user.balance_ton}`);
    console.log(`   - Пакет: ${user.ton_boost_package}`);
    console.log(`   - Ставка: ${user.ton_boost_rate}`);
    
    // Расчет дохода
    const deposit = Math.max(0, parseFloat(user.balance_ton) - 10);
    const dailyRate = user.ton_boost_rate;
    const dailyIncome = deposit * dailyRate;
    const fiveMinuteIncome = dailyIncome / 288; // 288 = 24*60/5
    
    console.log(`   - Депозит: ${deposit} TON`);
    console.log(`   - Дневной доход: ${dailyIncome.toFixed(6)} TON`);
    console.log(`   - Доход за 5 мин: ${fiveMinuteIncome.toFixed(8)} TON`);
    
    if (fiveMinuteIncome <= 0) {
      console.log(`   ⚠️ Нулевой доход, пропускаем`);
      continue;
    }
    
    // 3. Обновление баланса
    const newBalance = (parseFloat(user.balance_ton) + fiveMinuteIncome).toFixed(8);
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ balance_ton: newBalance })
      .eq('id', user.id);
    
    if (updateError) {
      console.log(`   ❌ Ошибка обновления баланса: ${updateError.message}`);
      continue;
    }
    
    console.log(`   ✅ Баланс обновлен: ${user.balance_ton} → ${newBalance}`);
    
    // 4. Создание транзакции
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'FARMING_REWARD',
        amount_uni: '0',
        amount_ton: fiveMinuteIncome.toFixed(8),
        status: 'completed',
        description: `TON Boost доход (пакет ${user.ton_boost_package}): ${fiveMinuteIncome.toFixed(6)} TON`
      });
    
    if (transactionError) {
      console.log(`   ❌ Ошибка создания транзакции: ${transactionError.message}`);
    } else {
      console.log(`   ✅ Транзакция создана: ${fiveMinuteIncome.toFixed(8)} TON`);
    }
  }
  
  console.log('\n=== ТЕСТ ПЛАНИРОВЩИКА ЗАВЕРШЕН ===');
}

testSchedulerManual().catch(console.error);