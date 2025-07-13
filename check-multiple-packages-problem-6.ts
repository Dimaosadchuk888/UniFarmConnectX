import { supabase } from './core/supabase';

async function investigateMultiplePackagesProblem6() {
  console.log("=== ИССЛЕДОВАНИЕ ПРОБЛЕМЫ №6: Множественные TON Boost пакеты ===\n");
  
  // 1. Проверяем структуру хранения пакетов
  console.log("1. Анализ структуры хранения пакетов:");
  
  // Смотрим сколько записей на пользователя в ton_farming_data
  const { data: userCounts, error: error1 } = await supabase
    .from('ton_farming_data')
    .select('user_id');
    
  if (userCounts) {
    const countByUser: any = {};
    userCounts.forEach((record: any) => {
      countByUser[record.user_id] = (countByUser[record.user_id] || 0) + 1;
    });
    
    const multipleRecords = Object.values(countByUser).filter((count: any) => count > 1);
    console.log(`   - Всего пользователей в ton_farming_data: ${Object.keys(countByUser).length}`);
    console.log(`   - Пользователей с несколькими записями: ${multipleRecords.length}`);
    console.log(`   - Структура: ${multipleRecords.length > 0 ? 'ПОДДЕРЖИВАЕТ множественные пакеты' : 'ОДНА запись на пользователя'}`);
  }
  
  // 2. Проверяем историю покупок пользователя 74
  console.log("\n\n2. История покупок пользователя 74:");
  
  // Ищем все покупки TON Boost
  const { data: allPurchases, error: error2 } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .or('type.eq.BOOST_PURCHASE,and(metadata->>original_type.eq.BOOST_PURCHASE)')
    .eq('currency', 'TON')
    .order('created_at', { ascending: false });
    
  if (allPurchases && allPurchases.length > 0) {
    console.log(`   - Всего покупок найдено: ${allPurchases.length}`);
    
    let totalPurchaseAmount = 0;
    allPurchases.forEach((purchase: any, index: number) => {
      const amount = Math.abs(purchase.amount_ton || purchase.amount || 0);
      totalPurchaseAmount += amount;
      
      if (index < 5) {
        console.log(`\n   Покупка ${index + 1}:`);
        console.log(`   - ID: ${purchase.id}`);
        console.log(`   - Тип: ${purchase.type}`);
        console.log(`   - Сумма: ${amount} TON`);
        console.log(`   - Metadata: ${JSON.stringify(purchase.metadata)}`);
        console.log(`   - Дата: ${purchase.created_at}`);
      }
    });
    
    console.log(`\n   - Общая сумма всех покупок: ${totalPurchaseAmount} TON`);
  } else {
    console.log("   - Покупок не найдено");
  }
  
  // 3. Проверяем таблицу boost_purchases
  console.log("\n\n3. Анализ таблицы boost_purchases:");
  
  const { data: boostPurchasesTable, error: error3 } = await supabase
    .from('boost_purchases')
    .select('*')
    .eq('user_id', 74)
    .order('created_at', { ascending: false });
    
  if (boostPurchasesTable && boostPurchasesTable.length > 0) {
    console.log(`   - Записей в boost_purchases: ${boostPurchasesTable.length}`);
    boostPurchasesTable.forEach((bp: any, index: number) => {
      console.log(`\n   Запись ${index + 1}:`);
      console.log(`   - package_id: ${bp.package_id}`);
      console.log(`   - amount: ${bp.amount}`);
      console.log(`   - currency: ${bp.currency}`);
      console.log(`   - created_at: ${bp.created_at}`);
    });
  } else {
    console.log("   - Таблица boost_purchases пуста или не используется");
  }
  
  // 4. Анализ начисления дохода
  console.log("\n\n4. Анализ начисления дохода по пакетам:");
  
  // Смотрим последние начисления для пользователя 74
  const { data: recentIncome, error: error4 } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (recentIncome && recentIncome.length > 0) {
    console.log(`   - Последние начисления TON Boost:`);
    
    const uniqueAmounts = new Set();
    recentIncome.forEach((income: any, index: number) => {
      uniqueAmounts.add(income.amount_ton || income.amount);
      
      if (index < 3) {
        console.log(`\n   Начисление ${index + 1}:`);
        console.log(`   - Сумма: ${income.amount_ton || income.amount} TON`);
        console.log(`   - Package ID из metadata: ${income.metadata?.boost_package_id}`);
        console.log(`   - User deposit из metadata: ${income.metadata?.user_deposit}`);
      }
    });
    
    console.log(`\n   - Уникальных сумм начислений: ${uniqueAmounts.size}`);
    console.log(`   - Вывод: ${uniqueAmounts.size === 1 ? 'Начисляется ОДИНАКОВАЯ сумма (агрегированно)' : 'Начисляются РАЗНЫЕ суммы (по пакетам)'}`);
  }
  
  console.log("\n\n=== ВЫВОДЫ ПО ПРОБЛЕМЕ №6 ===");
  console.log("1. Структура БД: проверено количество записей на пользователя");
  console.log("2. История покупок: найдены все покупки пользователя 74");
  console.log("3. Таблица boost_purchases: проверено использование");
  console.log("4. Паттерн начислений: проанализированы суммы доходов");
  
  process.exit(0);
}

investigateMultiplePackagesProblem6().catch(console.error);
