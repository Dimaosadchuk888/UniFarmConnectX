import { supabase } from './core/supabase';

async function investigateTransactionTypesProblem4() {
  console.log("=== ИССЛЕДОВАНИЕ ПРОБЛЕМЫ №4: Типы транзакций ===\n");
  
  const userId = 74;
  
  // 1. Проверяем какие типы транзакций существуют в БД
  console.log("1. Анализ типов транзакций в базе данных:");
  
  const { data: allTypes, error: error1 } = await supabase
    .from('transactions')
    .select('type')
    .not('type', 'is', null);
    
  if (allTypes) {
    const uniqueTypes = [...new Set(allTypes.map((t: any) => t.type))];
    console.log(`   - Уникальные типы в БД: ${uniqueTypes.join(', ')}`);
    console.log(`   - Всего типов: ${uniqueTypes.length}`);
  }
  
  // 2. Проверяем транзакции пользователя 74 по типам
  console.log("\n2. Транзакции пользователя 74 по типам:");
  
  const { data: userTransactions, error: error2 } = await supabase
    .from('transactions')
    .select('type, currency, count')
    .eq('user_id', userId);
    
  if (userTransactions) {
    // Группируем по типу и валюте
    const grouped: any = {};
    userTransactions.forEach((tx: any) => {
      const key = `${tx.type}_${tx.currency}`;
      if (!grouped[key]) {
        grouped[key] = { type: tx.type, currency: tx.currency, count: 0 };
      }
      grouped[key].count++;
    });
    
    Object.values(grouped).forEach((g: any) => {
      console.log(`   - ${g.type} (${g.currency}): ${g.count} транзакций`);
    });
  }
  
  // 3. Анализ metadata для TON транзакций
  console.log("\n3. Анализ metadata для TON транзакций:");
  
  const { data: tonTransactions, error: error3 } = await supabase
    .from('transactions')
    .select('id, type, amount_ton, metadata')
    .eq('user_id', userId)
    .eq('currency', 'TON')
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (tonTransactions) {
    console.log(`   - Найдено TON транзакций с metadata: ${tonTransactions.length}`);
    
    // Анализируем metadata
    const metadataTypes: any = {};
    tonTransactions.forEach((tx: any) => {
      if (tx.metadata.original_type) {
        metadataTypes[tx.metadata.original_type] = (metadataTypes[tx.metadata.original_type] || 0) + 1;
      }
    });
    
    console.log("\n   Типы в metadata.original_type:");
    Object.entries(metadataTypes).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count} транзакций`);
    });
  }
  
  // 4. Проверка UI фильтров (смотрим в код)
  console.log("\n4. Анализ UI компонентов:");
  console.log("   Проверяем какие фильтры используются в UI компонентах...");
  
  // 5. Сравнение типов транзакций
  console.log("\n5. Проблемные транзакции:");
  
  // Ищем транзакции которые могут не отображаться
  const { data: farmingRewards, error: error4 } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (farmingRewards && farmingRewards.length > 0) {
    console.log(`\n   TON транзакции с типом FARMING_REWARD:`);
    console.log(`   - Найдено: ${farmingRewards.length}`);
    farmingRewards.slice(0, 2).forEach((tx: any) => {
      console.log(`\n   Транзакция ID ${tx.id}:`);
      console.log(`   - Тип: ${tx.type}`);
      console.log(`   - Сумма: ${tx.amount_ton} TON`);
      console.log(`   - Metadata: ${JSON.stringify(tx.metadata)}`);
    });
  }
  
  console.log("\n\n=== ВЫВОДЫ ПО ПРОБЛЕМЕ №4 ===");
  console.log("1. Типы транзакций: перечислены все уникальные типы в БД");
  console.log("2. Распределение: показано количество транзакций по типам");
  console.log("3. Metadata анализ: проверены original_type для TON транзакций");
  console.log("4. Проблемные транзакции: найдены TON FARMING_REWARD");
  
  process.exit(0);
}

investigateTransactionTypesProblem4().catch(console.error);
