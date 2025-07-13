import { supabase } from './core/supabase';

async function investigateFarmingBalanceProblem5() {
  console.log("=== ИССЛЕДОВАНИЕ ПРОБЛЕМЫ №5: farming_balance = 0 ===\n");
  
  // 1. Проверяем всех активных TON Boost пользователей
  console.log("1. Анализ farming_balance у активных пользователей:");
  
  const { data: tonFarmingUsers, error: error1 } = await supabase
    .from('ton_farming_data')
    .select('*')
    .not('boost_package_id', 'is', null)
    .order('created_at', { ascending: false });
    
  if (tonFarmingUsers && tonFarmingUsers.length > 0) {
    console.log(`   - Всего активных пользователей TON Boost: ${tonFarmingUsers.length}`);
    
    // Анализируем farming_balance
    const withZeroBalance = tonFarmingUsers.filter((u: any) => u.farming_balance === 0 || u.farming_balance === '0');
    const withPositiveBalance = tonFarmingUsers.filter((u: any) => u.farming_balance > 0);
    
    console.log(`\n   Статистика farming_balance:`);
    console.log(`   - С нулевым балансом: ${withZeroBalance.length} (${Math.round(withZeroBalance.length / tonFarmingUsers.length * 100)}%)`);
    console.log(`   - С положительным балансом: ${withPositiveBalance.length} (${Math.round(withPositiveBalance.length / tonFarmingUsers.length * 100)}%)`);
    
    // Примеры пользователей
    console.log(`\n   Примеры пользователей с farming_balance = 0:`);
    withZeroBalance.slice(0, 3).forEach((user: any) => {
      console.log(`   - User ${user.user_id}: package_id=${user.boost_package_id}, created=${user.created_at}`);
    });
    
    if (withPositiveBalance.length > 0) {
      console.log(`\n   Примеры пользователей с farming_balance > 0:`);
      withPositiveBalance.slice(0, 3).forEach((user: any) => {
        console.log(`   - User ${user.user_id}: balance=${user.farming_balance}, package_id=${user.boost_package_id}`);
      });
    }
  }
  
  // 2. Проверяем транзакции покупки для понимания процесса
  console.log("\n\n2. Анализ процесса покупки TON Boost:");
  
  const { data: boostPurchases, error: error2 } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'BOOST_PURCHASE')
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (boostPurchases && boostPurchases.length > 0) {
    console.log(`   - Найдено транзакций покупки: ${boostPurchases.length}`);
    boostPurchases.forEach((tx: any, index: number) => {
      console.log(`\n   Покупка ${index + 1}:`);
      console.log(`   - User ID: ${tx.user_id}`);
      console.log(`   - Сумма: ${tx.amount_ton} TON`);
      console.log(`   - Дата: ${tx.created_at}`);
    });
  } else {
    console.log("   - Транзакций BOOST_PURCHASE не найдено");
  }
  
  // 3. Проверяем поля участвующие в расчёте дохода
  console.log("\n\n3. Анализ полей для расчёта дохода:");
  
  // Смотрим на пользователя 74 детально
  const { data: user74Data, error: error3 } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', 74)
    .single();
    
  if (user74Data) {
    console.log("\n   Детальный анализ пользователя 74:");
    console.log(`   - farming_balance: ${user74Data.farming_balance}`);
    console.log(`   - farming_rate: ${user74Data.farming_rate}`);
    console.log(`   - boost_package_id: ${user74Data.boost_package_id}`);
    console.log(`   - created_at: ${user74Data.created_at}`);
    console.log(`   - updated_at: ${user74Data.updated_at}`);
    
    // Проверяем основной баланс TON
    const { data: user74Main } = await supabase
      .from('users')
      .select('balance_ton, ton_boost_package')
      .eq('id', 74)
      .single();
      
    if (user74Main) {
      console.log(`\n   Основные данные пользователя 74:`);
      console.log(`   - balance_ton: ${user74Main.balance_ton}`);
      console.log(`   - ton_boost_package: ${user74Main.ton_boost_package}`);
    }
  }
  
  // 4. Проверяем историю обновлений farming_balance
  console.log("\n\n4. Проверка истории изменений farming_balance:");
  
  const { data: recentUpdates, error: error4 } = await supabase
    .from('ton_farming_data')
    .select('user_id, farming_balance, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10);
    
  if (recentUpdates) {
    console.log("   Последние обновления ton_farming_data:");
    recentUpdates.forEach((update: any, index: number) => {
      const updateTime = new Date(update.updated_at);
      const now = new Date();
      const diffHours = Math.floor((now.getTime() - updateTime.getTime()) / 1000 / 60 / 60);
      console.log(`   ${index + 1}. User ${update.user_id}: balance=${update.farming_balance}, обновлено ${diffHours} часов назад`);
    });
  }
  
  console.log("\n\n=== ВЫВОДЫ ПО ПРОБЛЕМЕ №5 ===");
  console.log("1. Статистика: подсчитан процент пользователей с нулевым farming_balance");
  console.log("2. Процесс покупки: проверены транзакции BOOST_PURCHASE");
  console.log("3. Поля для расчёта: детально изучен пользователь 74");
  console.log("4. История обновлений: проверено когда последний раз обновлялись данные");
  
  process.exit(0);
}

investigateFarmingBalanceProblem5().catch(console.error);
