import { supabase } from './core/supabaseClient';

async function checkAccounts191to307() {
  console.log('=== СРОЧНАЯ ПРОВЕРКА TON BOOST ПОЛЬЗОВАТЕЛЕЙ 191-307 ===\n');
  
  // 1. Проверяем сколько из них имеют TON Boost
  console.log('1. СТАТИСТИКА TON BOOST ПАКЕТОВ:');
  const { data: tonBoostUsers } = await supabase
    .from('users')
    .select('id, telegram_id, username, ton_boost_package, ton_farming_balance, balance_ton')
    .gte('id', 191)
    .lte('id', 307)
    .gt('ton_boost_package', 0)
    .order('id');
    
  if (tonBoostUsers) {
    console.log(`✅ Найдено ${tonBoostUsers.length} пользователей с TON Boost из диапазона 191-307\n`);
    
    // Группируем по пакетам
    const byPackage: Record<string, any[]> = {};
    tonBoostUsers.forEach(user => {
      if (!byPackage[user.ton_boost_package]) {
        byPackage[user.ton_boost_package] = [];
      }
      byPackage[user.ton_boost_package].push(user);
    });
    
    Object.entries(byPackage).forEach(([packageId, users]) => {
      console.log(`\nПакет ${packageId}: ${users.length} пользователей`);
    });
  }
  
  // 2. Проверяем статус в ton_farming_data
  console.log('\n\n2. ПРОВЕРКА АКТИВНОСТИ В ton_farming_data:');
  const userIds = tonBoostUsers?.map(u => u.id) || [];
  
  if (userIds.length > 0) {
    const { data: farmingData } = await supabase
      .from('ton_farming_data')
      .select('user_id, boost_active, boost_package_id, farming_balance, created_at')
      .in('user_id', userIds);
      
    let activeCount = 0;
    let inactiveCount = 0;
    const inactiveUsers: number[] = [];
    
    if (farmingData) {
      farmingData.forEach(data => {
        if (data.boost_active) {
          activeCount++;
        } else {
          inactiveCount++;
          inactiveUsers.push(data.user_id);
        }
      });
      
      console.log(`✅ Активных: ${activeCount}`);
      console.log(`❌ Неактивных: ${inactiveCount}`);
      
      if (inactiveUsers.length > 0 && inactiveUsers.length <= 20) {
        console.log(`\nНеактивные пользователи: ${inactiveUsers.join(', ')}`);
      }
    }
  }
  
  // 3. Проверяем последние TON farming транзакции
  console.log('\n\n3. ПОСЛЕДНИЕ TON FARMING ТРАНЗАКЦИИ (191-307):');
  const { data: recentFarming } = await supabase
    .from('transactions')
    .select('user_id, amount, created_at')
    .in('user_id', userIds)
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (recentFarming && recentFarming.length > 0) {
    console.log('Последние 10 TON farming транзакций:');
    recentFarming.forEach(tx => {
      const hours = Math.floor((Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60 * 60));
      console.log(`├── User ${tx.user_id}: ${tx.amount} TON - ${tx.created_at} (${hours}ч назад)`);
    });
  } else {
    console.log('❌ НЕТ недавних TON farming транзакций!');
  }
  
  // 4. Проверяем активность за последние 2 часа
  console.log('\n\n4. АКТИВНОСТЬ ЗА ПОСЛЕДНИЕ 2 ЧАСА:');
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  
  const { data: recentActive } = await supabase
    .from('transactions')
    .select('user_id')
    .in('user_id', userIds)
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .gte('created_at', twoHoursAgo);
    
  if (recentActive) {
    const uniqueActive = new Set(recentActive.map(t => t.user_id));
    console.log(`✅ ${uniqueActive.size} из ${userIds.length} получали TON farming за последние 2 часа`);
    
    if (uniqueActive.size < userIds.length) {
      console.log(`⚠️ ${userIds.length - uniqueActive.size} пользователей НЕ получали farming!`);
    }
  }
  
  // 5. Проверяем когда были созданы boost пакеты
  console.log('\n\n5. ДАТЫ СОЗДАНИЯ BOOST ПАКЕТОВ:');
  const { data: creationDates } = await supabase
    .from('ton_farming_data')
    .select('user_id, created_at')
    .in('user_id', userIds)
    .order('created_at');
    
  if (creationDates && creationDates.length > 0) {
    const firstDate = new Date(creationDates[0].created_at);
    const lastDate = new Date(creationDates[creationDates.length - 1].created_at);
    
    console.log(`Первый пакет: ${firstDate.toISOString()}`);
    console.log(`Последний пакет: ${lastDate.toISOString()}`);
    console.log(`Диапазон: ${Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))} дней`);
  }
}

checkAccounts191to307();