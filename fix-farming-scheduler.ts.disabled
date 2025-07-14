import { supabase } from './core/supabase';
import { logger } from './core/logger';

async function fixFarmingScheduler() {
  console.log('=== DIRECT FARMING REWARDS PROCESSOR ===\n');
  
  // Get active farmers directly from database
  const { data: activeFarmers, error: farmersError } = await supabase
    .from('users')
    .select('*')
    .eq('uni_farming_active', true)
    .not('uni_deposit_amount', 'is', null)
    .gt('uni_deposit_amount', '0');
    
  if (farmersError) {
    console.error('Error fetching farmers:', farmersError);
    return;
  }
  
  console.log(`Found ${activeFarmers.length} active farmers\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  // Process each farmer
  for (const farmer of activeFarmers) {
    try {
      // Calculate income
      const now = new Date();
      const lastUpdate = new Date(farmer.uni_farming_last_update || farmer.created_at);
      const hoursSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
      const daysElapsed = hoursSinceLastUpdate / 24;
      const depositAmount = parseFloat(farmer.uni_deposit_amount || '0');
      const rate = parseFloat(farmer.uni_farming_rate || '0.01');
      const income = depositAmount * rate * daysElapsed;
      
      if (income > 0.001) { // Only process if income is meaningful
        // Create transaction
        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: farmer.id,
            type: 'FARMING_REWARD',
            amount: income.toString(),
            amount_uni: income.toString(),
            amount_ton: '0',
            currency: 'UNI',
            status: 'completed',
            description: `UNI farming income: ${income.toFixed(6)} UNI (rate: ${rate})`,
            source_user_id: farmer.id,
            created_at: now.toISOString()
          });
          
        if (txError) {
          console.error(`Error creating transaction for user ${farmer.id}:`, txError.message);
          errorCount++;
        } else {
          // Update balance
          const newBalance = parseFloat(farmer.balance_uni || '0') + income;
          const { error: updateError } = await supabase
            .from('users')
            .update({
              balance_uni: newBalance.toString(),
              uni_farming_last_update: now.toISOString()
            })
            .eq('id', farmer.id);
            
          if (updateError) {
            console.error(`Error updating balance for user ${farmer.id}:`, updateError.message);
          } else {
            successCount++;
            logger.info(`Processed farming for user ${farmer.id}: +${income.toFixed(6)} UNI`);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing farmer ${farmer.id}:`, error);
      errorCount++;
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total farmers processed: ${activeFarmers.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  
  // Check results for user 74
  const { data: user74Tx } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .eq('type', 'FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (user74Tx && user74Tx[0]) {
    const minutesAgo = (Date.now() - new Date(user74Tx[0].created_at).getTime()) / 60000;
    if (minutesAgo < 2) {
      console.log(`\n✅ User 74 farming reward created: ${user74Tx[0].amount_uni} UNI`);
    }
  }
}

fixFarmingScheduler().catch(console.error);