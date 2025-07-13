import { farmingScheduler } from './core/scheduler/farmingScheduler';
import { supabase } from './core/supabase';

async function testDirectFarmingIncome() {
  console.log('=== TESTING DIRECT FARMING INCOME PROCESSING ===\n');
  
  // Test direct call to processUniFarmingIncome
  console.log('Calling processUniFarmingIncome directly...');
  
  // @ts-ignore - accessing private method for testing
  await farmingScheduler.processUniFarmingIncome();
  
  console.log('\nChecking for new transactions...');
  
  // Check if any new transactions were created
  const { data: recentTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (recentTx && recentTx.length > 0) {
    console.log(`\nFound ${recentTx.length} recent FARMING_REWARD transactions:`);
    recentTx.forEach(tx => {
      const minutesAgo = (Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60);
      console.log(`  User ${tx.user_id}: ${tx.amount_uni} UNI (${minutesAgo.toFixed(1)} minutes ago)`);
    });
  }
  
  process.exit(0);
}

testDirectFarmingIncome().catch(console.error);