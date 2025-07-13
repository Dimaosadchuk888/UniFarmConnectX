import { supabase } from './core/supabase';
import { UniFarmingRepository } from './modules/farming/UniFarmingRepository';
import { logger } from './core/logger';

async function testFarmingWithoutBatch() {
  console.log('=== TESTING FARMING WITHOUT BATCH UPDATE ===\n');
  
  const repository = new UniFarmingRepository();
  
  // Get active farmers
  const activeFarmers = await repository.getActiveFarmers();
  console.log(`Found ${activeFarmers.length} active farmers\n`);
  
  // Process only user 74
  const farmer = activeFarmers.find(f => f.user_id === 74);
  if (!farmer) {
    console.log('User 74 not found in active farmers');
    return;
  }
  
  console.log(`Processing user 74:`, {
    deposit: farmer.deposit_amount,
    rate: farmer.farming_rate,
    lastUpdate: farmer.farming_last_update
  });
  
  // Calculate income
  const now = new Date();
  const lastUpdate = new Date(farmer.farming_last_update || farmer.created_at);
  const hoursSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
  const daysElapsed = hoursSinceLastUpdate / 24;
  const income = parseFloat(farmer.deposit_amount || '0') * parseFloat(farmer.farming_rate || '0.01') * daysElapsed;
  
  console.log(`\nCalculated income: ${income.toFixed(6)} UNI`);
  console.log(`Days elapsed: ${daysElapsed.toFixed(4)}`);
  
  // Create transaction directly
  console.log('\nCreating FARMING_REWARD transaction...');
  
  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: farmer.user_id,
      type: 'FARMING_REWARD',
      amount: income.toString(),
      amount_uni: income.toString(),
      amount_ton: '0',
      currency: 'UNI',
      status: 'completed',
      description: `UNI farming income: ${income.toFixed(6)} UNI (rate: ${farmer.farming_rate})`,
      source_user_id: farmer.user_id,
      created_at: new Date().toISOString()
    })
    .select();
    
  if (txError) {
    console.error('❌ Failed to create transaction:', txError);
  } else {
    console.log('✅ Transaction created successfully!');
    console.log('Transaction ID:', txData[0].id);
    
    // Update farming last update time
    const { error: updateError } = await supabase
      .from('users')
      .update({ uni_farming_last_update: now.toISOString() })
      .eq('id', farmer.user_id);
      
    if (!updateError) {
      console.log('✅ Updated farming last update time');
    }
  }
  
  // Check all recent transactions
  const { data: allTx } = await supabase
    .from('transactions')
    .select('user_id, amount_uni, created_at')
    .eq('type', 'FARMING_REWARD')
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });
    
  console.log(\`\\nTotal FARMING_REWARD transactions in last 5 minutes: \${allTx?.length || 0}\`);
}

testFarmingWithoutBatch().catch(console.error);