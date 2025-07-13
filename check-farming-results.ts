import { supabase } from './core/supabase';

async function checkResults() {
  // Check latest farming rewards
  const { data: latestRewards } = await supabase
    .from('transactions')
    .select('user_id, amount_uni, created_at')
    .eq('type', 'FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log('Latest farming rewards:');
  latestRewards?.forEach(tx => {
    const minutesAgo = (Date.now() - new Date(tx.created_at).getTime()) / 60000;
    console.log(`User ${tx.user_id}: +${tx.amount_uni} UNI (${minutesAgo.toFixed(1)} minutes ago)`);
  });

  // Check user 74 specifically
  const { data: user74 } = await supabase
    .from('users')
    .select('balance_uni, uni_deposit_amount, uni_farming_last_update')
    .eq('id', 74)
    .single();
  
  console.log('\nUser 74 current state:');
  console.log('Balance:', user74?.balance_uni, 'UNI');
  console.log('Deposit:', user74?.uni_deposit_amount, 'UNI');
  console.log('Last update:', new Date(user74?.uni_farming_last_update).toLocaleString());
  
  // Count total farming rewards in last hour
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'FARMING_REWARD')
    .gte('created_at', hourAgo);
    
  console.log('\nTotal farming rewards in last hour:', count);
}

checkResults();