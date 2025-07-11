import { supabase } from './core/supabaseClient';

async function checkTransactionTypesCase() {
  console.log('=== ПРОВЕРКА РЕГИСТРА ТИПОВ ТРАНЗАКЦИЙ ===\n');
  
  // Получаем уникальные типы транзакций из базы
  const { data: transactions } = await supabase
    .from('transactions')
    .select('type')
    .limit(1000);
    
  const uniqueTypes = new Set();
  transactions?.forEach(tx => {
    if (tx.type) uniqueTypes.add(tx.type);
  });
  
  console.log('Уникальные типы транзакций в базе:');
  console.log('===================================');
  Array.from(uniqueTypes).sort().forEach(type => {
    console.log(`- ${type}`);
  });
  
  // Проверяем, есть ли транзакции с типами TON
  console.log('\nПроверка наличия TON типов:');
  console.log('===========================');
  
  const tonTypes = [
    'TON_BOOST_REWARD',
    'ton_boost_reward',
    'TON_BOOST_INCOME', 
    'ton_boost_income',
    'FARMING_REWARD'
  ];
  
  for (const type of tonTypes) {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('type', type);
      
    console.log(`${type}: ${count || 0} транзакций`);
  }
  
  process.exit(0);
}

checkTransactionTypesCase().catch(console.error);