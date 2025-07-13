import { supabase } from '../core/supabase';

async function checkTransactionTypes() {
  console.log('Checking available transaction types in database...\n');
  
  // Получаем уникальные типы транзакций из БД
  const { data, error } = await supabase
    .from('transactions')
    .select('type')
    .limit(1000);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  // Собираем уникальные типы
  const uniqueTypes = new Set<string>();
  data?.forEach(row => {
    if (row.type) uniqueTypes.add(row.type);
  });
  
  console.log('Transaction types found in database:');
  Array.from(uniqueTypes).sort().forEach(type => {
    console.log(`- ${type}`);
  });
  
  // Проверяем наличие TON_BOOST_INCOME
  if (uniqueTypes.has('TON_BOOST_INCOME')) {
    console.log('\n✅ SUCCESS: TON_BOOST_INCOME type is available in database!');
  } else {
    console.log('\n❌ ERROR: TON_BOOST_INCOME type is NOT found in database!');
    console.log('This means the database enum doesn\'t include this type.');
    console.log('The server will fallback to FARMING_REWARD type.');
  }
  
  // Проверяем код в TransactionModel
  console.log('\nChecking TransactionModel types...');
  const TransactionModel = require('../modules/transactions/model');
  console.log('TransactionType enum from code:', TransactionModel.TransactionType);
}

checkTransactionTypes().catch(console.error);