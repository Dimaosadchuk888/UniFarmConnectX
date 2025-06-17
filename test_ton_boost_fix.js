/**
 * Test TON Boost Transaction Type Fix
 * Verifies that the scheduler can now create transactions with correct type
 */

import { supabase } from './core/supabase.ts';

/**
 * Tests if we can create a transaction with the correct ton_boost_reward type
 */
async function testTransactionTypefix() {
  console.log('=== TESTING TON BOOST TRANSACTION TYPE FIX ===\n');
  
  try {
    // Test creating a transaction with the fixed type
    const testTransaction = {
      user_id: 4, // Use existing user
      type: 'ton_boost_reward', // Fixed transaction type
      amount: '0.001000',
      currency: 'TON',
      status: 'completed',
      description: 'Test TON Boost transaction with fixed type'
    };
    
    console.log('Creating test transaction with ton_boost_reward type...');
    const { data, error } = await supabase
      .from('transactions')
      .insert(testTransaction)
      .select()
      .single();
    
    if (error) {
      console.log('❌ Error creating transaction:', error.message);
      return false;
    }
    
    console.log('✅ Transaction created successfully:');
    console.log(`   ID: ${data.id}`);
    console.log(`   Type: ${data.type}`);
    console.log(`   Amount: ${data.amount} ${data.currency}`);
    console.log(`   Status: ${data.status}`);
    
    // Clean up test transaction
    await supabase
      .from('transactions')
      .delete()
      .eq('id', data.id);
    
    console.log('✅ Test transaction cleaned up\n');
    
    return true;
    
  } catch (error) {
    console.log('❌ Critical error:', error.message);
    return false;
  }
}

/**
 * Tests the TON Boost scheduler method directly
 */
async function testSchedulerMethod() {
  console.log('=== TESTING TON BOOST SCHEDULER METHOD ===\n');
  
  try {
    // Import the scheduler
    const { tonBoostIncomeScheduler } = await import('./modules/scheduler/tonBoostIncomeScheduler.js');
    
    console.log('✅ TON Boost scheduler imported successfully');
    console.log('Scheduler status:', tonBoostIncomeScheduler.getStatus());
    
    // Test the processing method
    console.log('\nTesting processTonBoostIncome method...');
    await tonBoostIncomeScheduler.processTonBoostIncome();
    
    console.log('✅ processTonBoostIncome completed without errors\n');
    
    return true;
    
  } catch (error) {
    console.log('❌ Scheduler test error:', error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runTonBoostFix() {
  try {
    console.log('🚀 Starting TON Boost transaction type fix verification\n');
    
    const transactionTest = await testTransactionTypefix();
    const schedulerTest = await testSchedulerMethod();
    
    console.log('=== FINAL RESULTS ===');
    console.log(`Transaction Type Fix: ${transactionTest ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`Scheduler Method: ${schedulerTest ? '✅ WORKING' : '❌ FAILED'}`);
    
    if (transactionTest && schedulerTest) {
      console.log('\n🎉 TON BOOST FIX SUCCESSFUL!');
      console.log('The "TON_BOOST_INCOME" error should be resolved');
    } else {
      console.log('\n⚠️  Some issues still remain');
    }
    
  } catch (error) {
    console.log('❌ Critical test error:', error);
  }
}

// Run the test
runTonBoostFix();