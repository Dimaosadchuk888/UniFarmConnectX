import { supabase } from './core/supabase';

async function investigateTonBoostProblem1() {
  console.log("=== ИССЛЕДОВАНИЕ ПРОБЛЕМЫ №1: TON Boost транзакции ===\n");
  
  const userId = 74;
  
  // 1. Проверяем пакеты в ton_farming_data
  console.log("1. Проверка пакетов в ton_farming_data:");
  const { data: tonFarmingData, error: error1 } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId);
    
  if (tonFarmingData && tonFarmingData.length > 0) {
    console.log(`   - Найдено записей: ${tonFarmingData.length}`);
    tonFarmingData.forEach((record: any, index: number) => {
      console.log(`\n   Запись ${index + 1}:`);
      console.log(`   - farming_balance: ${record.farming_balance}`);
      console.log(`   - farming_rate: ${record.farming_rate}`);
      console.log(`   - boost_package_id: ${record.boost_package_id}`);
      console.log(`   - created_at: ${record.created_at}`);
    });
  } else {
    console.log("   - Записей не найдено!");
  }
  
  // 2. Проверяем транзакции в базе данных
  console.log("\n\n2. Проверка транзакций TON Boost:");
  
  // Ищем все возможные типы транзакций
  const { data: transactions, error: error2 } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(20);
    
  if (transactions) {
    console.log(`   - Всего TON транзакций найдено: ${transactions.length}`);
    
    // Группируем по типам
    const byType: any = {};
    transactions.forEach((tx: any) => {
      const type = tx.type || 'UNKNOWN';
      if (!byType[type]) byType[type] = [];
      byType[type].push(tx);
    });
    
    console.log("\n   Транзакции по типам:");
    Object.keys(byType).forEach(type => {
      console.log(`   - ${type}: ${byType[type].length} транзакций`);
    });
    
    // Проверяем metadata
    console.log("\n   Проверка metadata для поиска TON_BOOST:");
    let tonBoostCount = 0;
    transactions.forEach((tx: any) => {
      if (tx.metadata && (tx.metadata.original_type === 'TON_BOOST_INCOME' || 
          tx.metadata.transaction_source === 'ton_boost_scheduler')) {
        tonBoostCount++;
        console.log(`   - Найдена TON Boost транзакция ID: ${tx.id}, сумма: ${tx.amount_ton || tx.amount}`);
      }
    });
    console.log(`   - Всего TON Boost транзакций (по metadata): ${tonBoostCount}`);
  }
  
  // 3. Проверяем покупки boost пакетов
  console.log("\n\n3. Проверка покупок boost пакетов:");
  const { data: boostPurchases, error: error3 } = await supabase
    .from('boost_purchases')
    .select('*')
    .eq('user_id', userId)
    .eq('currency', 'TON')
    .order('created_at', { ascending: false });
    
  if (boostPurchases && boostPurchases.length > 0) {
    console.log(`   - Найдено покупок: ${boostPurchases.length}`);
    boostPurchases.forEach((purchase: any, index: number) => {
      console.log(`\n   Покупка ${index + 1}:`);
      console.log(`   - package_id: ${purchase.package_id}`);
      console.log(`   - amount: ${purchase.amount}`);
      console.log(`   - created_at: ${purchase.created_at}`);
    });
  } else {
    console.log("   - Покупок в boost_purchases не найдено");
  }
  
  // 4. Анализ выводов
  console.log("\n\n=== ВЫВОДЫ ПО ПРОБЛЕМЕ №1 ===");
  console.log("1. Структура хранения: проверено наличие записей в ton_farming_data");
  console.log("2. Типы транзакций: проанализированы все типы и metadata");
  console.log("3. История покупок: проверена таблица boost_purchases");
  
  process.exit(0);
}

investigateTonBoostProblem1().catch(console.error);
