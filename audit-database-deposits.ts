import { supabase } from './core/supabaseClient';

async function auditDatabaseDeposits() {
  console.log('=== АУДИТ СИСТЕМЫ TON BOOST ===\n');
  
  // 1. Проверяем всех пользователей с активными TON boost пакетами
  console.log('1. ПОЛЬЗОВАТЕЛИ С АКТИВНЫМИ TON BOOST ПАКЕТАМИ:');
  const { data: activeBoosts } = await supabase
    .from('users')
    .select('id, telegram_id, ton_boost_package, ton_farming_balance, balance_ton')
    .gt('ton_boost_package', 0)
    .order('ton_boost_package', { ascending: false });
    
  if (activeBoosts) {
    console.log(`Найдено ${activeBoosts.length} пользователей с активными boost пакетами:\n`);
    
    let totalFarmingBalance = 0;
    const packageStats: { [key: number]: number } = {};
    
    activeBoosts.forEach(user => {
      console.log(`User ${user.id} (@${user.telegram_id}):`);
      console.log(`├── Boost пакет: ${user.ton_boost_package}`);
      console.log(`├── TON farming balance: ${user.ton_farming_balance} TON`);
      console.log(`├── Основной баланс TON: ${user.balance_ton} TON`);
      console.log(`└── Статус: ${user.ton_farming_balance > 0 ? '✅ Активен' : '❌ Пустой баланс'}\n`);
      
      totalFarmingBalance += parseFloat(user.ton_farming_balance || '0');
      packageStats[user.ton_boost_package] = (packageStats[user.ton_boost_package] || 0) + 1;
    });
    
    console.log('СТАТИСТИКА ПО ПАКЕТАМ:');
    Object.entries(packageStats).forEach(([packageId, count]) => {
      console.log(`├── Пакет ${packageId}: ${count} пользователей`);
    });
    console.log(`└── Общий farming balance: ${totalFarmingBalance.toFixed(3)} TON\n`);
  }
  
  // 2. Проверяем транзакции BOOST_PURCHASE за последний месяц
  console.log('2. АНАЛИЗ ТРАНЗАКЦИЙ BOOST_PURCHASE:');
  const { data: boostTransactions } = await supabase
    .from('transactions')
    .select('user_id, amount, amount_ton, created_at, metadata')
    .eq('type', 'BOOST_PURCHASE')
    .gte('created_at', '2025-07-01')
    .order('created_at', { ascending: false });
    
  if (boostTransactions) {
    console.log(`Найдено ${boostTransactions.length} транзакций BOOST_PURCHASE:\n`);
    
    // Группируем по пользователям
    const userPurchases: { [key: string]: number } = {};
    let totalInAmount = 0;
    let totalInAmountTon = 0;
    
    boostTransactions.forEach(tx => {
      const amountValue = Math.abs(parseFloat(tx.amount || '0'));
      const amountTonValue = parseFloat(tx.amount_ton || '0');
      
      userPurchases[tx.user_id] = (userPurchases[tx.user_id] || 0) + amountValue;
      totalInAmount += amountValue;
      totalInAmountTon += amountTonValue;
    });
    
    console.log('ПОЛЯ ТРАНЗАКЦИЙ:');
    console.log(`├── Сумма из поля amount: ${totalInAmount} TON`);
    console.log(`├── Сумма из поля amount_ton: ${totalInAmountTon} TON`);
    console.log(`└── Уникальных пользователей: ${Object.keys(userPurchases).length}\n`);
    
    console.log('ТОП-5 ПОКУПАТЕЛЕЙ:');
    const sortedUsers = Object.entries(userPurchases)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
      
    for (const [userId, total] of sortedUsers) {
      console.log(`├── User ${userId}: ${total} TON`);
    }
  }
  
  // 3. Проверяем таблицу ton_farming_data
  console.log('\n3. СОСТОЯНИЕ ТАБЛИЦЫ ton_farming_data:');
  const { data: farmingData } = await supabase
    .from('ton_farming_data')
    .select('user_id, farming_balance, boost_active, boost_package_id, daily_rate')
    .eq('boost_active', true);
    
  if (farmingData) {
    console.log(`Найдено ${farmingData.length} активных записей:\n`);
    
    let totalFarmingDataBalance = 0;
    farmingData.forEach(record => {
      totalFarmingDataBalance += parseFloat(record.farming_balance || '0');
    });
    
    console.log(`├── Общий farming_balance в ton_farming_data: ${totalFarmingDataBalance.toFixed(3)} TON`);
    console.log(`└── Среднее на пользователя: ${(totalFarmingDataBalance / farmingData.length).toFixed(3)} TON\n`);
  }
  
  // 4. Проверяем расхождения
  console.log('4. АНАЛИЗ РАСХОЖДЕНИЙ:');
  
  // Проверяем пользователей с boost но без farming balance
  const { data: problemUsers } = await supabase
    .from('users')
    .select('id, ton_boost_package, ton_farming_balance')
    .gt('ton_boost_package', 0)
    .eq('ton_farming_balance', 0);
    
  if (problemUsers && problemUsers.length > 0) {
    console.log(`⚠️ НАЙДЕНЫ ПРОБЛЕМНЫЕ АККАУНТЫ (${problemUsers.length}):`);
    problemUsers.forEach(user => {
      console.log(`├── User ${user.id}: пакет ${user.ton_boost_package}, но farming_balance = 0`);
    });
  } else {
    console.log('✅ Все пользователи с boost пакетами имеют farming balance');
  }
}

auditDatabaseDeposits();