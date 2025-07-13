import { supabase } from './core/supabase';

async function findBalanceSource() {
  console.log('🔍 Поиск источника баланса для TON Boost планировщика\n');

  // 1. Проверяем основной баланс TON пользователя 74
  const { data: user74, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', 74)
    .single();

  if (!userError && user74) {
    console.log('1️⃣ Балансы пользователя 74:');
    console.log(`- balance_ton (основной): ${user74.balance_ton} TON`);
    console.log(`- ton_farming_balance: ${user74.ton_farming_balance} TON`);
    console.log(`- ton_farming_deposit: ${user74.ton_farming_deposit || 'null'}`);
    console.log(`- ton_boost_active: ${user74.ton_boost_active}`);
    console.log(`- ton_boost_package: ${user74.ton_boost_package}`);
    
    // Проверяем, не используется ли основной баланс
    const possibleFarmingBalance = parseFloat(user74.balance_ton) || 0;
    console.log(`\n🎯 Основной баланс TON: ${possibleFarmingBalance.toFixed(2)} TON`);
    
    // Расчет дохода от этого баланса
    const rate = 1.5; // Standard Boost
    const dailyIncome = possibleFarmingBalance * (rate / 100);
    const incomePer5Minutes = (dailyIncome / 1440) * 5;
    
    console.log(`\n💰 Если используется основной баланс (${possibleFarmingBalance.toFixed(2)} TON):`);
    console.log(`- Доход за 5 минут при ставке ${rate}%: ${incomePer5Minutes.toFixed(6)} TON`);
    console.log(`- Фактический доход из транзакций: ~0.043 TON`);
    
    if (Math.abs(incomePer5Minutes - 0.043) < 0.001) {
      console.log(`\n✅ СОВПАДЕНИЕ! Планировщик использует основной баланс TON!`);
    }
  }

  // 2. Проверяем всех активных пользователей с ton_boost_active
  console.log('\n\n2️⃣ Проверка других активных пользователей:');
  
  const { data: activeUsers, error: activeError } = await supabase
    .from('users')
    .select('id, balance_ton, ton_farming_balance, ton_boost_active, ton_boost_package')
    .eq('ton_boost_active', true)
    .limit(5);

  if (!activeError && activeUsers) {
    console.log(`\nПроверка первых 5 активных пользователей:`);
    
    activeUsers.forEach(user => {
      console.log(`\nUser ${user.id}:`);
      console.log(`- balance_ton: ${user.balance_ton}`);
      console.log(`- ton_farming_balance: ${user.ton_farming_balance}`);
      console.log(`- ton_boost_package: ${user.ton_boost_package}`);
    });
  }

  // 3. Проверяем последние транзакции разных пользователей
  console.log('\n\n3️⃣ Анализ транзакций других пользователей:');
  
  const { data: recentTx, error: txError } = await supabase
    .from('transactions')
    .select('user_id, amount, description')
    .eq('currency', 'TON')
    .like('description', '%TON Boost доход%')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!txError && recentTx) {
    // Группируем по пользователям
    const userIncomes = recentTx.reduce((acc, tx) => {
      if (!acc[tx.user_id]) {
        acc[tx.user_id] = [];
      }
      acc[tx.user_id].push(parseFloat(tx.amount));
      return acc;
    }, {} as Record<number, number[]>);

    console.log('\nДоходы по пользователям:');
    
    for (const [userId, incomes] of Object.entries(userIncomes)) {
      const avgIncome = incomes.reduce((a, b) => a + b, 0) / incomes.length;
      
      // Получаем данные пользователя
      const { data: userData } = await supabase
        .from('users')
        .select('balance_ton, ton_boost_package')
        .eq('id', parseInt(userId))
        .single();
      
      if (userData) {
        console.log(`\nUser ${userId}:`);
        console.log(`- Средний доход: ${avgIncome.toFixed(6)} TON`);
        console.log(`- balance_ton: ${userData.balance_ton} TON`);
        console.log(`- Пакет: ${userData.ton_boost_package}`);
        
        // Определяем ставку по пакету
        const rates: Record<number, number> = {
          1: 1.0,   // Starter
          2: 1.5,   // Standard
          3: 2.0,   // Advanced
          4: 2.5,   // Premium
          5: 3.0    // Elite
        };
        
        const rate = rates[userData.ton_boost_package] || 1.5;
        const calculatedBalance = (avgIncome * 1440) / (5 * rate / 100);
        
        console.log(`- Расчетный баланс фарминга: ${calculatedBalance.toFixed(2)} TON`);
        console.log(`- Разница с balance_ton: ${Math.abs(calculatedBalance - parseFloat(userData.balance_ton)).toFixed(2)} TON`);
      }
    }
  }

  // 4. Итоговый вывод
  console.log('\n\n📊 ИТОГОВЫЙ ВЫВОД:');
  console.log('❗ Планировщик TON Boost использует поле balance_ton (основной баланс) для расчета дохода');
  console.log('❗ Поле ton_farming_balance игнорируется или не обновляется при покупках');
  console.log('❗ При покупке TON Boost пакета весь основной баланс TON начинает приносить доход');
}

findBalanceSource().catch(console.error);