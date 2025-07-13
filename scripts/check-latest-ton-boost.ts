import { supabase } from '../core/supabase';

async function checkLatestTonBoost() {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, user_id, type, amount_ton, metadata, created_at')
    .eq('currency', 'TON')
    .like('description', 'TON Boost%')
    .order('id', { ascending: false })
    .limit(3);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('\nLatest 3 TON Boost transactions:');
  data?.forEach(tx => {
    const time = new Date(tx.created_at).toLocaleTimeString('ru-RU');
    console.log(`\nID: ${tx.id} | User: ${tx.user_id} | Time: ${time}`);
    console.log(`Original Type: ${tx.metadata?.original_type || 'NOT SET'}`);
    console.log(`Expected: TON_BOOST_INCOME`);
    console.log(`Match: ${tx.metadata?.original_type === 'TON_BOOST_INCOME' ? '✅' : '❌'}`);
  });
}

checkLatestTonBoost().catch(console.error);