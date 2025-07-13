import { supabase } from './core/supabase';

async function investigateTonBoost() {
  console.log('=== TON BOOST ДЕТАЛЬНОЕ ИССЛЕДОВАНИЕ ===\n');
  console.log(`Время: ${new Date().toLocaleString()}\n`);

  try {
    // 1. Проверяем состояние планировщика через транзакции
    console.log('📊 1. СОСТОЯНИЕ ПЛАНИРОВЩИКА:\n');
    
    const { data: lastReward, error: rewardError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!rewardError && lastReward) {
      const now = new Date();
      const lastTime = new Date(lastReward.created_at);
      const diffMinutes = (now.getTime() - lastTime.getTime()) / 60000;
      
      console.log(`Последнее начисление: ${diffMinutes.toFixed(1)} минут назад`);
      console.log(`Время: ${lastTime.toLocaleString()}`);
      console.log(`Сумма: ${lastReward.amount} TON`);
      console.log(`Статус планировщика: ${diffMinutes > 10 ? '❌ НЕ РАБОТАЕТ' : '✅ РАБОТАЕТ'}\n`);
    } else {
      console.log('❌ Нет транзакций TON Boost\n');
    }

    // 2. Проверяем данные пользователя 74
    console.log('👤 2. ДАННЫЕ ПОЛЬЗОВАТЕЛЯ 74:\n');
    
    // Из таблицы users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, balance_ton, ton_boost_active, ton_boost_package_id, ton_farming_balance')
      .eq('id', 74)
      .single();

    if (!userError && userData) {
      console.log('Таблица users:');
      console.log(`  balance_ton: ${userData.balance_ton} TON`);
      console.log(`  ton_boost_active: ${userData.ton_boost_active}`);
      console.log(`  ton_boost_package_id: ${userData.ton_boost_package_id || 'NULL'}`);
      console.log(`  ton_farming_balance: ${userData.ton_farming_balance || 'NULL'} ${userData.ton_farming_balance ? '✅' : '❌'}\n`);
    }

    // Из таблицы ton_farming_data
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', 74)
      .single();

    if (!farmingError && farmingData) {
      console.log('Таблица ton_farming_data:');
      console.log(`  farming_balance: ${farmingData.farming_balance} TON ${parseFloat(farmingData.farming_balance) > 0 ? '✅' : '❌'}`);
      console.log(`  boost_active: ${farmingData.boost_active}`);
      console.log(`  boost_package_id: ${farmingData.boost_package_id}`);
      console.log(`  farming_rate: ${farmingData.farming_rate}%`);
      console.log(`  updated_at: ${new Date(farmingData.updated_at).toLocaleString()}\n`);
    }

    // 3. Проверяем последние покупки TON Boost
    console.log('🛒 3. ПОСЛЕДНИЕ ПОКУПКИ TON BOOST:\n');
    
    const { data: purchases, error: purchaseError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .in('type', ['BOOST_PURCHASE', 'FARMING_REWARD'])
      .eq('currency', 'TON')
      .like('description', '%Boost%')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!purchaseError && purchases) {
      const boostPurchases = purchases.filter(t => 
        t.description && (t.description.includes('Покупка TON Boost') || t.amount < 0)
      );
      
      console.log(`Найдено покупок: ${boostPurchases.length}`);
      
      if (boostPurchases.length > 0) {
        console.log('\nПоследние покупки:');
        boostPurchases.slice(0, 3).forEach(p => {
          console.log(`  ${new Date(p.created_at).toLocaleString()}: ${p.amount} TON - ${p.description}`);
          if (p.metadata) {
            console.log(`    Metadata: ${JSON.stringify(p.metadata)}`);
          }
        });
      }
    }

    // 4. Анализ архитектурной проблемы
    console.log('\n🔍 4. АРХИТЕКТУРНЫЙ АНАЛИЗ:\n');
    
    console.log('ПРОБЛЕМА #1: Планировщик не запускается');
    console.log('  - Использует setInterval вместо cron');
    console.log('  - Нет логов о старте после перезапуска');
    console.log('  - Ошибки в методе start() не логируются\n');
    
    console.log('ПРОБЛЕМА #2: Неверный расчет дохода');
    console.log('  - Код: userDeposit = balance_ton - 10');
    console.log('  - Должно быть: userDeposit = farming_balance');
    console.log(`  - Текущий расчет от: ${userData?.balance_ton} TON`);
    console.log(`  - Должен быть от: ${farmingData?.farming_balance || 0} TON\n`);
    
    console.log('ПРОБЛЕМА #3: farming_balance не обновляется');
    console.log('  - activateBoost() НЕ записывает сумму депозита');
    console.log('  - purchaseBoost() НЕ передает сумму в activateBoost()');
    console.log('  - Результат: farming_balance всегда 0\n');

    // 5. Финансовое воздействие
    console.log('💰 5. ФИНАНСОВОЕ ВОЗДЕЙСТВИЕ:\n');
    
    if (userData && farmingData) {
      const balanceTon = parseFloat(userData.balance_ton || '0');
      const farmingBalance = parseFloat(farmingData.farming_balance || '0');
      const rate = parseFloat(farmingData.farming_rate || '0') / 100;
      
      const currentDailyIncome = (balanceTon - 10) * rate;
      const correctDailyIncome = farmingBalance * rate;
      
      console.log(`Текущий расчет (неверный):`);
      console.log(`  База: ${balanceTon - 10} TON`);
      console.log(`  Доход в день: ${currentDailyIncome.toFixed(3)} TON`);
      
      console.log(`\nПравильный расчет:`);
      console.log(`  База: ${farmingBalance} TON`);
      console.log(`  Доход в день: ${correctDailyIncome.toFixed(3)} TON`);
      
      if (farmingBalance > 0 && currentDailyIncome > 0) {
        const overcharge = currentDailyIncome / correctDailyIncome;
        console.log(`\n❌ ЗАВЫШЕНИЕ: в ${overcharge.toFixed(1)} раз!`);
      }
    }

    // 6. Проверка всех активных TON Boost пользователей
    console.log('\n📈 6. ВСЕ АКТИВНЫЕ TON BOOST ПОЛЬЗОВАТЕЛИ:\n');
    
    const { data: activeUsers, error: activeError } = await supabase
      .from('ton_farming_data')
      .select('user_id, farming_balance, boost_active, boost_package_id')
      .eq('boost_active', true);

    if (!activeError && activeUsers) {
      console.log(`Всего активных: ${activeUsers.length}`);
      
      let zeroBalanceCount = 0;
      activeUsers.forEach(u => {
        if (parseFloat(u.farming_balance) === 0) zeroBalanceCount++;
      });
      
      console.log(`С нулевым farming_balance: ${zeroBalanceCount} (${(zeroBalanceCount/activeUsers.length*100).toFixed(0)}%)`);
      
      if (zeroBalanceCount === activeUsers.length) {
        console.log('\n❌ ВСЕ пользователи имеют farming_balance = 0!');
        console.log('   Это означает системную проблему при покупке пакетов.');
      }
    }

  } catch (error) {
    console.error('❌ Ошибка исследования:', error);
  }
}

investigateTonBoost();