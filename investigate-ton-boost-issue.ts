import { supabase } from './core/supabase';

async function investigateTonBoost() {
  console.log('🔍 Исследование проблемы с TON Boost транзакциями\n');

  // 1. Проверяем активные TON Boost пакеты пользователя 74
  console.log('1️⃣ Проверка активных TON Boost пакетов пользователя 74:');
  
  const { data: tonFarmingData, error: tonError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', '74')
    .single();

  if (tonError) {
    console.error('❌ Ошибка получения ton_farming_data:', tonError);
  } else if (tonFarmingData) {
    console.log('\n📦 Данные TON Boost пользователя 74:');
    console.log(`- ID пакета: ${tonFarmingData.boost_package_id}`);
    console.log(`- Баланс фарминга: ${tonFarmingData.farming_balance} TON`);
    console.log(`- Ставка фарминга: ${tonFarmingData.farming_rate}% в день`);
    console.log(`- Активен: ${tonFarmingData.is_active ? 'Да' : 'Нет'}`);
    console.log(`- Последнее обновление: ${new Date(tonFarmingData.farming_last_update).toLocaleString()}`);
  }

  // 2. Проверяем информацию о boost пакете
  if (tonFarmingData?.boost_package_id) {
    const { data: boostPackage, error: packageError } = await supabase
      .from('boost_packages')
      .select('*')
      .eq('id', tonFarmingData.boost_package_id)
      .single();

    if (!packageError && boostPackage) {
      console.log(`\n📋 Информация о пакете ${boostPackage.name}:`);
      console.log(`- Дневная ставка: ${boostPackage.daily_rate}%`);
      console.log(`- Диапазон суммы: ${boostPackage.min_amount} - ${boostPackage.max_amount} TON`);
    }
  }

  // 3. Проверяем последние транзакции TON Boost для пользователя 74
  console.log('\n2️⃣ Последние транзакции TON Boost пользователя 74:');
  
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .eq('currency', 'TON')
    .like('description', '%TON Boost%')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!txError && transactions) {
    console.log(`\nНайдено ${transactions.length} транзакций:`);
    transactions.forEach(tx => {
      console.log(`\n- ID: ${tx.id}`);
      console.log(`  Сумма: ${tx.amount} TON`);
      console.log(`  Описание: ${tx.description}`);
      console.log(`  Время: ${new Date(tx.created_at).toLocaleString()}`);
    });

    // Анализируем интервалы между транзакциями
    if (transactions.length > 1) {
      console.log('\n⏱️ Интервалы между транзакциями:');
      for (let i = 0; i < transactions.length - 1; i++) {
        const time1 = new Date(transactions[i].created_at).getTime();
        const time2 = new Date(transactions[i + 1].created_at).getTime();
        const diffMinutes = Math.round((time1 - time2) / 60000);
        console.log(`- Между транзакциями ${i + 1} и ${i + 2}: ${diffMinutes} минут`);
      }
    }
  }

  // 4. Проверяем баланс пользователя
  console.log('\n3️⃣ Текущий баланс пользователя 74:');
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('balance_ton, balance_uni')
    .eq('id', 74)
    .single();

  if (!userError && user) {
    console.log(`- Баланс TON: ${user.balance_ton}`);
    console.log(`- Баланс UNI: ${user.balance_uni}`);
  }

  // 5. Расчет ожидаемого дохода
  if (tonFarmingData && tonFarmingData.is_active) {
    console.log('\n4️⃣ Расчет ожидаемого дохода:');
    const dailyRate = tonFarmingData.farming_rate / 100;
    const incomePerDay = tonFarmingData.farming_balance * dailyRate;
    const incomePerHour = incomePerDay / 24;
    const incomePerMinute = incomePerHour / 60;
    const incomePer5Minutes = incomePerMinute * 5;

    console.log(`- Баланс в фарминге: ${tonFarmingData.farming_balance} TON`);
    console.log(`- Ставка: ${tonFarmingData.farming_rate}% в день`);
    console.log(`- Доход в день: ${incomePerDay.toFixed(6)} TON`);
    console.log(`- Доход в час: ${incomePerHour.toFixed(6)} TON`);
    console.log(`- Доход за 5 минут: ${incomePer5Minutes.toFixed(6)} TON`);
  }

  // 6. Проверяем всех активных пользователей TON Boost
  console.log('\n5️⃣ Общая статистика активных пользователей TON Boost:');
  
  const { data: activeUsers, error: activeError } = await supabase
    .from('ton_farming_data')
    .select('user_id, boost_package_id, farming_balance, farming_rate')
    .eq('is_active', true);

  if (!activeError && activeUsers) {
    console.log(`\nВсего активных пользователей: ${activeUsers.length}`);
    
    // Группируем по пакетам
    const packageStats = activeUsers.reduce((acc, user) => {
      const pkgId = user.boost_package_id || 'unknown';
      if (!acc[pkgId]) {
        acc[pkgId] = { count: 0, totalBalance: 0 };
      }
      acc[pkgId].count++;
      acc[pkgId].totalBalance += parseFloat(user.farming_balance) || 0;
      return acc;
    }, {} as Record<string, {count: number, totalBalance: number}>);

    console.log('\nСтатистика по пакетам:');
    Object.entries(packageStats).forEach(([pkgId, stats]) => {
      console.log(`- Пакет ${pkgId}: ${stats.count} пользователей, общий баланс: ${stats.totalBalance.toFixed(2)} TON`);
    });
  }

  // 7. Проверяем, создаются ли транзакции для всех активных пользователей
  console.log('\n6️⃣ Проверка создания транзакций за последние 10 минут:');
  
  const tenMinutesAgo = new Date();
  tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

  const { data: recentTonTx, error: recentError } = await supabase
    .from('transactions')
    .select('user_id, amount, description')
    .eq('currency', 'TON')
    .like('description', '%TON Boost%')
    .gte('created_at', tenMinutesAgo.toISOString())
    .order('created_at', { ascending: false });

  if (!recentError && recentTonTx) {
    const uniqueUsers = new Set(recentTonTx.map(tx => tx.user_id));
    console.log(`\nТранзакции созданы для ${uniqueUsers.size} уникальных пользователей из ${activeUsers?.length || 0} активных`);
    
    if (activeUsers && uniqueUsers.size < activeUsers.length) {
      console.log('\n⚠️ ПРОБЛЕМА: Не все активные пользователи получают транзакции!');
      const missingUsers = activeUsers
        .filter(u => !uniqueUsers.has(parseInt(u.user_id)))
        .map(u => u.user_id);
      console.log(`Пользователи без транзакций: ${missingUsers.join(', ')}`);
    }
  }
}

investigateTonBoost().catch(console.error);