import { farmingScheduler } from './core/scheduler/farmingScheduler';
import { supabase } from './core/supabase';

async function testSchedulerOnce() {
  console.log('=== TESTING FARMING SCHEDULER ONCE ===\n');
  
  // Get initial transaction count for user 74
  const { data: beforeTx, error: beforeError } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', 74)
    .eq('type', 'FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(1);
    
  const lastTxId = beforeTx?.[0]?.id || 0;
  console.log('Last transaction ID before test:', lastTxId);
  
  // Start the scheduler
  console.log('\nStarting farming scheduler...');
  farmingScheduler.start();
  
  // Wait for the scheduler to process
  console.log('Waiting 15 seconds for scheduler to process...');
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  // Stop the scheduler
  farmingScheduler.stop();
  console.log('\nScheduler stopped.');
  
  // Check if new transactions were created
  const { data: afterTx, error: afterError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .eq('type', 'FARMING_REWARD')
    .gt('id', lastTxId)
    .order('created_at', { ascending: false });
    
  if (afterTx && afterTx.length > 0) {
    console.log(`\n✅ SUCCESS! ${afterTx.length} new FARMING_REWARD transactions created:`);
    afterTx.forEach(tx => {
      console.log(`  - Amount: ${tx.amount_uni} UNI, Created: ${new Date(tx.created_at).toISOString()}`);
    });
  } else {
    console.log('\n❌ NO new FARMING_REWARD transactions were created');
  }
  
  // Check system-wide
  const { data: allNewTx } = await supabase
    .from('transactions')
    .select('user_id')
    .eq('type', 'FARMING_REWARD')
    .gt('id', lastTxId);
    
  if (allNewTx && allNewTx.length > 0) {
    const uniqueUsers = new Set(allNewTx.map(tx => tx.user_id));
    console.log(`\nTotal new farming transactions: ${allNewTx.length} for ${uniqueUsers.size} users`);
  }
  
  process.exit(0);
}

testSchedulerOnce().catch(console.error);