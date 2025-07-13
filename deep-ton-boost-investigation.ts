import { supabase } from './core/supabase';

async function deepInvestigation() {
  console.log('🔍 Углубленное исследование проблемы TON Boost\n');

  // 1. Проверяем данные в таблице users
  console.log('1️⃣ Проверка данных в таблице users для пользователя 74:');
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', 74)
    .single();

  if (!userError && user) {
    console.log('\n📊 Поля связанные с TON Boost:');
    console.log(`- ton_boost_active: ${user.ton_boost_active}`);
    console.log(`- ton_boost_package: ${user.ton_boost_package}`); 
    console.log(`- ton_farming_deposit: ${user.ton_farming_deposit}`);
    console.log(`- ton_farming_balance: ${user.ton_farming_balance}`);
    console.log(`- ton_farming_rate: ${user.ton_farming_rate}%`);
    console.log(`- ton_farming_last_update: ${user.ton_farming_last_update ? new Date(user.ton_farming_last_update).toLocaleString() : 'null'}`);
  }

  // 2. Проверяем историю покупок TON Boost
  console.log('\n2️⃣ История покупок TON Boost пользователя 74:');
  
  const { data: purchases, error: purchaseError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .like('description', '%Покупка TON Boost%')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!purchaseError && purchases) {
    console.log(`\nНайдено ${purchases.length} покупок:`);
    let totalSpent = 0;
    purchases.forEach((tx, index) => {
      console.log(`\n${index + 1}. ${tx.description}`);
      console.log(`   Сумма: ${tx.amount} TON`);
      console.log(`   Дата: ${new Date(tx.created_at).toLocaleString()}`);
      totalSpent += parseFloat(tx.amount);
    });
    console.log(`\n💰 Общая сумма потрачена на TON Boost: ${totalSpent} TON`);
  }

  // 3. Проверяем активных пользователей с ton_boost_active
  console.log('\n3️⃣ Активные пользователи TON Boost (из таблицы users):');
  
  const { data: activeUsers, error: activeError } = await supabase
    .from('users')
    .select('id, telegram_id, ton_boost_active, ton_boost_package, ton_farming_balance, ton_farming_deposit')
    .eq('ton_boost_active', true)
    .order('ton_farming_balance', { ascending: false });

  if (!activeError && activeUsers) {
    console.log(`\nВсего активных: ${activeUsers.length} пользователей`);
    
    // Показываем топ-5 по балансу
    console.log('\nТоп-5 по балансу фарминга:');
    activeUsers.slice(0, 5).forEach((user, index) => {
      console.log(`${index + 1}. User ${user.id} (telegram: ${user.telegram_id})`);
      console.log(`   Пакет: ${user.ton_boost_package}`);
      console.log(`   Депозит: ${user.ton_farming_deposit} TON`);
      console.log(`   Баланс: ${user.ton_farming_balance} TON`);
    });

    // Проверяем пользователя 74
    const user74 = activeUsers.find(u => u.id === 74);
    if (user74) {
      console.log(`\n⚠️ Пользователь 74 АКТИВЕН в TON Boost!`);
      console.log(`Но его баланс фарминга: ${user74.ton_farming_balance} TON`);
    } else {
      console.log(`\n❌ Пользователь 74 НЕ активен в TON Boost`);
    }
  }

  // 4. Анализ расчета дохода
  if (user && user.ton_boost_active) {
    console.log('\n4️⃣ Анализ расчета дохода пользователя 74:');
    
    const deposit = parseFloat(user.ton_farming_deposit) || 0;
    const balance = parseFloat(user.ton_farming_balance) || 0;
    const rate = parseFloat(user.ton_farming_rate) || 0;
    
    console.log(`\n📊 Данные для расчета:`);
    console.log(`- Депозит: ${deposit} TON`);
    console.log(`- Баланс: ${balance} TON`);
    console.log(`- Ставка: ${rate}% в день`);
    
    const dailyIncome = balance * (rate / 100);
    const incomePerMinute = dailyIncome / 1440; // 1440 минут в дне
    const incomePer5Minutes = incomePerMinute * 5;
    
    console.log(`\n💰 Расчетный доход:`);
    console.log(`- В день: ${dailyIncome.toFixed(6)} TON`);
    console.log(`- За 5 минут: ${incomePer5Minutes.toFixed(6)} TON`);
    
    console.log(`\n🔍 Фактический доход из транзакций: ~0.043 TON за 5 минут`);
    
    if (Math.abs(incomePer5Minutes - 0.043) > 0.001) {
      console.log('\n⚠️ НЕСООТВЕТСТВИЕ между расчетным и фактическим доходом!');
      
      // Обратный расчет - какой должен быть баланс для дохода 0.043
      const actualBalance = (0.043 * 1440) / (5 * rate / 100);
      console.log(`\n🔢 Обратный расчет:`);
      console.log(`Для дохода 0.043 TON за 5 минут при ставке ${rate}%`);
      console.log(`Необходим баланс: ${actualBalance.toFixed(2)} TON`);
    }
  }

  // 5. Проверяем последнюю транзакцию для определения реального баланса
  console.log('\n5️⃣ Определение реального баланса из транзакций:');
  
  const lastIncome = 0.043065548; // Последний доход из транзакции
  const rate = 1.5; // Standard Boost - 1.5% в день
  const minutesPerDay = 1440;
  const incomeInterval = 5; // минут
  
  const calculatedBalance = (lastIncome * minutesPerDay) / (incomeInterval * rate / 100);
  
  console.log(`\n🔢 Расчет на основе последней транзакции:`);
  console.log(`- Последний доход: ${lastIncome} TON за 5 минут`);
  console.log(`- Ставка: ${rate}% в день`);
  console.log(`- Расчетный баланс в фарминге: ${calculatedBalance.toFixed(2)} TON`);
  
  console.log(`\n❗ ВЫВОД: Пользователь 74 имеет ~${calculatedBalance.toFixed(0)} TON в активном фарминге,`);
  console.log(`но в базе данных записан баланс ${user?.ton_farming_balance || 0} TON`);
}

deepInvestigation().catch(console.error);