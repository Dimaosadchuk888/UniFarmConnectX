import { supabase } from '../core/supabase';

async function checkLatestTransactions() {
  console.log('Checking latest TON Boost transactions...\n');
  
  const { data, error } = await supabase
    .from('transactions')
    .select('id, user_id, type, amount_ton, description, created_at')
    .eq('currency', 'TON')
    .like('description', 'TON Boost%')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Latest TON Boost transactions:');
  console.log('='.repeat(100));
  
  data?.forEach(tx => {
    const date = new Date(tx.created_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
    console.log(`ID: ${tx.id} | User: ${tx.user_id} | Type: ${tx.type} | Amount: ${tx.amount_ton} TON | Time: ${date}`);
    console.log(`Description: ${tx.description}`);
    console.log('-'.repeat(100));
  });
  
  // Проверка типов транзакций
  const typeCount: Record<string, number> = {};
  data?.forEach(tx => {
    typeCount[tx.type] = (typeCount[tx.type] || 0) + 1;
  });
  
  console.log('\nTransaction type summary:');
  Object.entries(typeCount).forEach(([type, count]) => {
    console.log(`${type}: ${count} transactions`);
  });
  
  // Проверка наличия новых транзакций TON_BOOST_INCOME
  const tonBoostIncomeCount = data?.filter(tx => tx.type === 'TON_BOOST_INCOME').length || 0;
  if (tonBoostIncomeCount > 0) {
    console.log(`\n✅ SUCCESS: Found ${tonBoostIncomeCount} transactions with type TON_BOOST_INCOME!`);
  } else {
    console.log('\n⚠️  WARNING: No transactions with type TON_BOOST_INCOME found yet.');
    console.log('Make sure the server is restarted and wait for the next scheduler cycle (every 5 minutes).');
  }
}

checkLatestTransactions().catch(console.error);