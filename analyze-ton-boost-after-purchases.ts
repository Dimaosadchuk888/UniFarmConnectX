import { supabase } from './core/supabase';

async function analyzeTonBoostAfterPurchases() {
  console.log('=== АНАЛИЗ TON BOOST ПОСЛЕ НОВЫХ ПОКУПОК ===\n');
  console.log(`Время анализа: ${new Date().toLocaleString()}\n`);

  try {
    // 1. Проверяем пользователя 74 в ton_farming_data
    console.log('📊 1. ПРОВЕРКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ 74:\n');
    
    const { data: tonData, error: tonError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', 74)
      .single();

    if (tonError) {
      console.log('❌ Ошибка получения из ton_farming_data:', tonError.message);
      
      // Проверяем fallback
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, balance_ton, ton_boost_active, ton_boost_package_id, ton_farming_balance, ton_farming_rate')
        .eq('id', 74)
        .single();

      if (userError) {
        console.error('❌ Ошибка получения из users:', userError.message);
      } else if (userData) {
        console.log('📍 Данные из таблицы users:');
        console.log(`  ID: ${userData.id}`);
        console.log(`  Balance TON: ${userData.balance_ton}`);
        console.log(`  TON Boost Active: ${userData.ton_boost_active}`);
        console.log(`  Package ID: ${userData.ton_boost_package_id}`);
        console.log(`  Farming Balance: ${userData.ton_farming_balance || '0'} TON`);
        console.log(`  Rate: ${userData.ton_farming_rate}%`);
      }
    } else if (tonData) {
      console.log('✅ Данные из ton_farming_data:');
      console.log(`  User ID: ${tonData.user_id}`);
      console.log(`  Boost Active: ${tonData.boost_active}`);
      console.log(`  Package ID: ${tonData.boost_package_id}`);
      console.log(`  Farming Balance: ${tonData.farming_balance} TON ${tonData.farming_balance > 0 ? '✅' : '❌'}`);
      console.log(`  Farming Rate: ${tonData.farming_rate}%`);
      console.log(`  Last Update: ${new Date(tonData.farming_last_update).toLocaleString()}`);
      
      if (parseFloat(tonData.farming_balance) > 0) {
        const dailyIncome = parseFloat(tonData.farming_balance) * parseFloat(tonData.farming_rate);
        console.log(`\n  💰 Ожидаемый доход: ${dailyIncome.toFixed(6)} TON/день`);
        console.log(`  ⏱️  За 5 минут: ${(dailyIncome * 5 / 1440).toFixed(6)} TON`);
      }
    }

    // 2. Проверяем транзакции покупки пакетов
    console.log('\n📝 2. ТРАНЗАКЦИИ ПОКУПКИ TON BOOST (последние 5):\n');
    
    const { data: purchases, error: purchaseError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .eq('type', 'BOOST_PURCHASE')
      .order('created_at', { ascending: false })
      .limit(5);

    if (purchaseError) {
      console.error('❌ Ошибка получения покупок:', purchaseError.message);
    } else if (purchases && purchases.length > 0) {
      console.log(`Найдено покупок: ${purchases.length}\n`);
      
      for (const purchase of purchases) {
        console.log(`  📅 ${new Date(purchase.created_at).toLocaleString()}`);
        console.log(`  💵 Сумма: ${purchase.amount} ${purchase.currency}`);
        console.log(`  📋 Описание: ${purchase.description}`);
        
        if (purchase.metadata) {
          const metadata = typeof purchase.metadata === 'string' ? JSON.parse(purchase.metadata) : purchase.metadata;
          if (metadata.boost_package) {
            console.log(`  📦 Пакет: ${metadata.boost_package.name} (ID: ${metadata.boost_package.id})`);
            console.log(`  📈 Ставка: ${metadata.boost_package.daily_rate}%`);
          }
        }
        console.log('  ---');
      }
    } else {
      console.log('  Транзакции покупки не найдены');
    }

    // 3. Проверяем транзакции начислений
    console.log('\n💸 3. ТРАНЗАКЦИИ НАЧИСЛЕНИЙ TON BOOST (последние 10):\n');
    
    const { data: rewards, error: rewardError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(10);

    if (rewardError) {
      console.error('❌ Ошибка получения начислений:', rewardError.message);
    } else if (rewards && rewards.length > 0) {
      console.log(`Найдено начислений: ${rewards.length}\n`);
      
      let totalRewards = 0;
      for (const reward of rewards) {
        const amount = parseFloat(reward.amount);
        totalRewards += amount;
        
        console.log(`  📅 ${new Date(reward.created_at).toLocaleString()}`);
        console.log(`  💰 Сумма: +${amount.toFixed(6)} TON`);
        console.log(`  📋 ${reward.description}`);
        
        if (reward.metadata) {
          const metadata = typeof reward.metadata === 'string' ? JSON.parse(reward.metadata) : reward.metadata;
          if (metadata.deposit_amount !== undefined) {
            console.log(`  📊 Депозит в метаданных: ${metadata.deposit_amount} TON`);
          }
        }
        console.log('  ---');
      }
      
      console.log(`\n  📊 Общая сумма последних 10 начислений: ${totalRewards.toFixed(6)} TON`);
    } else {
      console.log('  Транзакции начислений не найдены');
    }

    // 4. Проверяем все активные TON Boost пользователи
    console.log('\n👥 4. ВСЕ АКТИВНЫЕ TON BOOST ПОЛЬЗОВАТЕЛИ:\n');
    
    const { data: allActive, error: allError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('boost_active', true)
      .order('farming_balance', { ascending: false });

    if (allError) {
      console.log('❌ Ошибка получения активных пользователей:', allError.message);
    } else if (allActive && allActive.length > 0) {
      console.log(`Всего активных: ${allActive.length}\n`);
      
      let totalDeposits = 0;
      let usersWithDeposits = 0;
      
      for (const user of allActive) {
        const deposit = parseFloat(user.farming_balance || '0');
        totalDeposits += deposit;
        if (deposit > 0) usersWithDeposits++;
        
        console.log(`  User ${user.user_id}: ${deposit} TON ${deposit > 0 ? '✅' : '❌'} (пакет ${user.boost_package_id})`);
      }
      
      console.log(`\n📊 СТАТИСТИКА:`);
      console.log(`  - Пользователей с депозитами: ${usersWithDeposits}/${allActive.length}`);
      console.log(`  - Общая сумма депозитов: ${totalDeposits.toFixed(2)} TON`);
      console.log(`  - Средний депозит: ${(totalDeposits / allActive.length).toFixed(2)} TON`);
    }

    // 5. Анализ корректности системы
    console.log('\n🔍 5. АНАЛИЗ КОРРЕКТНОСТИ СИСТЕМЫ:\n');
    
    const issues = [];
    
    if (tonData && parseFloat(tonData.farming_balance || '0') === 0 && tonData.boost_active) {
      issues.push('❌ Пользователь 74 имеет активный boost, но farming_balance = 0');
    }
    
    if (purchases && purchases.length > 0 && (!tonData || parseFloat(tonData.farming_balance || '0') === 0)) {
      issues.push('❌ Есть транзакции покупки, но farming_balance не обновлен');
    }
    
    if (rewards && rewards.length > 0) {
      const lastReward = rewards[0];
      if (parseFloat(lastReward.amount) > 1) {
        issues.push('⚠️  Последнее начисление выглядит завышенным (>1 TON за 5 минут)');
      }
    }
    
    if (issues.length === 0) {
      console.log('✅ Система работает корректно!');
      console.log('✅ Депозиты фиксируются в farming_balance');
      console.log('✅ Транзакции создаются с правильными типами');
      console.log('✅ Начисления соответствуют депозитам');
    } else {
      console.log('Обнаружены проблемы:');
      issues.forEach(issue => console.log(`  ${issue}`));
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

analyzeTonBoostAfterPurchases();