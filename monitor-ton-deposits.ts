/**
 * Monitoring script for TON deposits to track success/failure rates
 */

import { supabase } from './core/supabase';
import { logger } from './core/logger';

async function monitorTonDeposits() {
  console.log('📊 TON Deposit Monitoring Report\n');
  
  try {
    // Get recent TON deposits from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: deposits, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching deposits:', error);
      return;
    }
    
    console.log(`Found ${deposits?.length || 0} TON deposits in last 24 hours\n`);
    
    // Analyze deposits
    let successCount = 0;
    let failedCount = 0;
    let bocCount = 0;
    let hashCount = 0;
    
    deposits?.forEach(deposit => {
      const metadata = deposit.metadata as any;
      
      // Check if deposit was successful
      if (deposit.status === 'completed') {
        successCount++;
      } else {
        failedCount++;
      }
      
      // Check if it was BOC or direct hash
      if (metadata?.original_boc || metadata?.hash_extracted) {
        bocCount++;
      } else {
        hashCount++;
      }
      
      // Log critical deposits
      if (metadata?.requires_manual_review || metadata?.fallback_reason) {
        console.log('⚠️ Deposit requiring attention:');
        console.log(`   ID: ${deposit.id}`);
        console.log(`   User: ${deposit.user_id}`);
        console.log(`   Amount: ${deposit.amount_ton} TON`);
        console.log(`   Status: ${deposit.status}`);
        console.log(`   Fallback reason: ${metadata.fallback_reason || 'N/A'}`);
        console.log(`   Created: ${deposit.created_at}\n`);
      }
    });
    
    // Print summary
    console.log('📈 Summary:');
    console.log(`   Total deposits: ${deposits?.length || 0}`);
    console.log(`   Successful: ${successCount} (${((successCount / (deposits?.length || 1)) * 100).toFixed(1)}%)`);
    console.log(`   Failed: ${failedCount} (${((failedCount / (deposits?.length || 1)) * 100).toFixed(1)}%)`);
    console.log(`   BOC deposits: ${bocCount}`);
    console.log(`   Direct hash deposits: ${hashCount}`);
    
    // Check for patterns
    if (failedCount > 0) {
      console.log('\n⚠️ Action required:');
      console.log(`   ${failedCount} deposits failed and may need manual review`);
    }
    
    if (bocCount > 0) {
      console.log('\n🔍 BOC Processing:');
      console.log(`   ${bocCount} deposits used BOC data`);
      console.log('   With the fix, these should now extract real blockchain hashes');
    }
    
    // Log to system
    logger.info('[DepositMonitor] Daily report', {
      total: deposits?.length || 0,
      successful: successCount,
      failed: failedCount,
      bocDeposits: bocCount,
      directHashDeposits: hashCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Monitor error:', error);
    logger.error('[DepositMonitor] Error generating report', { error });
  }
}

// Run the monitor
monitorTonDeposits().catch(console.error);