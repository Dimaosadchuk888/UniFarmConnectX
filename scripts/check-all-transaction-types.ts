import { supabase } from '../core/supabase';

async function checkAllTransactionTypes() {
  console.log('Checking ALL transaction types in database...\n');
  
  // Получаем все уникальные типы транзакций
  const { data, error } = await supabase.rpc('get_distinct_transaction_types');
  
  if (error) {
    console.log('RPC failed, trying direct query...');
    // Fallback: получаем транзакции напрямую
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('type')
      .not('type', 'is', null);
      
    if (txError) {
      console.error('Error:', txError);
      return;
    }
    
    // Собираем уникальные типы
    const uniqueTypes = new Set<string>();
    transactions?.forEach(row => {
      if (row.type) uniqueTypes.add(row.type);
    });
    
    console.log('All unique transaction types found in database:');
    const typesArray = Array.from(uniqueTypes).sort();
    typesArray.forEach(type => {
      console.log(`  - "${type}"`);
    });
    
    // Проверяем конкретные типы для TON Boost
    console.log('\n🔍 Checking for TON Boost related types:');
    const tonBoostTypes = ['TON_BOOST_INCOME', 'TON_BOOST_REWARD', 'TON_FARMING_INCOME', 'BOOST_PURCHASE'];
    tonBoostTypes.forEach(type => {
      if (uniqueTypes.has(type)) {
        console.log(`  ✅ ${type} - EXISTS`);
      } else {
        console.log(`  ❌ ${type} - NOT FOUND`);
      }
    });
    
    // Рекомендация
    console.log('\n📝 RECOMMENDATION:');
    if (uniqueTypes.has('BOOST_PURCHASE')) {
      console.log('Since BOOST_PURCHASE exists, we could use metadata to distinguish TON Boost income.');
      console.log('Alternative: Continue using FARMING_REWARD with metadata.original_type = "TON_BOOST_INCOME"');
    }
  }
}

checkAllTransactionTypes().catch(console.error);