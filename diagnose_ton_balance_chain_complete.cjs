#!/usr/bin/env node
/**
 * COMPREHENSIVE TON BALANCE DISPLAY CHAIN DIAGNOSTIC
 * Technical investigation of complete deposit processing flow
 * WITHOUT CODE CHANGES - Analysis only
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials');
  console.log(`   SUPABASE_URL: ${supabaseUrl ? 'set' : 'missing'}`);
  console.log(`   SUPABASE_KEY: ${supabaseKey ? 'set' : 'missing'}`);
  console.log('   Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPA') || k.includes('DATABASE')));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function comprehensiveTonBalanceDiagnostic() {
  console.log('🔍 COMPREHENSIVE TON BALANCE CHAIN DIAGNOSTIC');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');

  const targetUsers = [
    { id: 25, telegram_id: 425855744, username: 'DimaOsadchuk' },
    { id: 227, telegram_id: 25, username: 'DimaOsadchuk' }
  ];

  const diagnosticResults = {};

  for (const user of targetUsers) {
    console.log(`👤 ANALYZING USER ${user.id} (telegram_id: ${user.telegram_id})`);
    console.log('-'.repeat(50));

    const userDiagnostic = {};

    // STEP 1: Database State Analysis
    console.log('1️⃣ DATABASE STATE ANALYSIS');
    
    // Get user record
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.log(`❌ User ${user.id} not found:`, userError.message);
      continue;
    }

    userDiagnostic.userRecord = userData;
    console.log(`✅ User found: ID=${userData.id}, telegram_id=${userData.telegram_id}`);
    console.log(`   Balance TON: ${userData.balance_ton || 0}`);
    console.log(`   Balance UNI: ${userData.balance_uni || 0}`);
    console.log(`   Username: ${userData.username || 'null'}`);
    console.log(`   Created: ${userData.created_at}`);

    // STEP 2: Transaction History Analysis
    console.log('\n2️⃣ TRANSACTION HISTORY ANALYSIS');
    
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (txError) {
      console.log(`❌ Transaction query error:`, txError.message);
    } else {
      userDiagnostic.transactions = transactions || [];
      console.log(`📊 Total transactions: ${transactions.length}`);
      
      // TON related transactions
      const tonTransactions = transactions.filter(t => 
        t.type === 'TON_DEPOSIT' || 
        t.currency === 'TON' ||
        t.description?.includes('TON') ||
        t.metadata?.original_type === 'TON_DEPOSIT'
      );
      
      console.log(`💎 TON transactions: ${tonTransactions.length}`);
      
      tonTransactions.forEach((tx, idx) => {
        console.log(`   ${idx + 1}. ${tx.created_at} | ${tx.type} | ${tx.amount} ${tx.currency || 'TON'} | ${tx.status}`);
        if (tx.metadata) {
          console.log(`      Metadata: ${JSON.stringify(tx.metadata)}`);
        }
        if (tx.description?.includes('blockchain') || tx.description?.includes('deposit')) {
          console.log(`      Description: ${tx.description}`);
        }
      });

      // Calculate balance from transactions
      const tonBalance = tonTransactions
        .filter(tx => tx.status === 'COMPLETED')
        .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
      
      userDiagnostic.calculatedTonBalance = tonBalance;
      console.log(`🧮 Calculated TON balance from transactions: ${tonBalance}`);
      console.log(`📊 Database TON balance: ${userData.balance_ton || 0}`);
      
      if (Math.abs(tonBalance - (userData.balance_ton || 0)) > 0.001) {
        console.log(`⚠️  BALANCE MISMATCH! Difference: ${tonBalance - (userData.balance_ton || 0)}`);
        userDiagnostic.balanceMismatch = true;
        userDiagnostic.balanceDifference = tonBalance - (userData.balance_ton || 0);
      } else {
        console.log(`✅ Balance matches transactions`);
        userDiagnostic.balanceMismatch = false;
      }
    }

    // STEP 3: Authentication Context Analysis
    console.log('\n3️⃣ AUTHENTICATION CONTEXT ANALYSIS');
    
    // Check if there are multiple users with same username
    const { data: sameUsernameUsers, error: usernameError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton, created_at')
      .eq('username', user.username);

    if (!usernameError && sameUsernameUsers?.length > 1) {
      console.log(`⚠️  USERNAME COLLISION DETECTED!`);
      console.log(`   Users with username "${user.username}":`);
      sameUsernameUsers.forEach(u => {
        console.log(`   - ID: ${u.id}, telegram_id: ${u.telegram_id}, balance_ton: ${u.balance_ton}`);
      });
      userDiagnostic.usernameCollision = true;
      userDiagnostic.collisionUsers = sameUsernameUsers;
    } else {
      console.log(`✅ No username collision`);
      userDiagnostic.usernameCollision = false;
    }

    // STEP 4: Recent Activity Analysis
    console.log('\n4️⃣ RECENT ACTIVITY ANALYSIS (Last 24 hours)');
    
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    
    const { data: recentTx, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    if (!recentError) {
      console.log(`📅 Recent transactions (24h): ${recentTx?.length || 0}`);
      
      recentTx?.forEach((tx, idx) => {
        const timeAgo = Math.round((Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60));
        console.log(`   ${idx + 1}. ${timeAgo}m ago | ${tx.type} | ${tx.amount} ${tx.currency || ''} | ${tx.status}`);
      });
      
      userDiagnostic.recentTransactions = recentTx || [];
    }

    // STEP 5: TON Farming Data Analysis
    console.log('\n5️⃣ TON FARMING DATA ANALYSIS');
    
    const { data: tonFarmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', user.id);

    if (!farmingError && tonFarmingData?.length > 0) {
      console.log(`🌾 TON Farming records: ${tonFarmingData.length}`);
      tonFarmingData.forEach((farming, idx) => {
        console.log(`   ${idx + 1}. farming_balance: ${farming.farming_balance}, farming_rate: ${farming.farming_rate}`);
        console.log(`      boost_package_id: ${farming.boost_package_id}, active: ${farming.boost_active}`);
      });
      userDiagnostic.tonFarmingData = tonFarmingData;
    } else {
      console.log(`📭 No TON farming data found`);
      userDiagnostic.tonFarmingData = [];
    }

    diagnosticResults[user.id] = userDiagnostic;
    console.log('\n' + '='.repeat(50));
    console.log('');
  }

  // STEP 6: Cross-Reference Analysis
  console.log('6️⃣ CROSS-REFERENCE ANALYSIS');
  console.log('-'.repeat(50));

  const user25 = diagnosticResults[25];
  const user227 = diagnosticResults[227];

  if (user25 && user227) {
    console.log('🔄 COMPARING USERS 25 vs 227:');
    console.log(`   User 25 TON Balance: ${user25.userRecord?.balance_ton || 0}`);
    console.log(`   User 227 TON Balance: ${user227.userRecord?.balance_ton || 0}`);
    console.log(`   User 25 Transactions: ${user25.transactions?.length || 0}`);
    console.log(`   User 227 Transactions: ${user227.transactions?.length || 0}`);
    
    if (user25.usernameCollision && user227.usernameCollision) {
      console.log(`⚠️  CONFIRMED: Both users share username collision`);
      console.log(`   This explains why deposits may go to wrong user account`);
    }

    // Check for transaction migration patterns
    const user25TonTx = user25.transactions?.filter(tx => 
      tx.currency === 'TON' || tx.type === 'TON_DEPOSIT'
    ).length || 0;
    
    const user227TonTx = user227.transactions?.filter(tx => 
      tx.currency === 'TON' || tx.type === 'TON_DEPOSIT'
    ).length || 0;

    console.log(`💎 TON Transactions comparison:`);
    console.log(`   User 25: ${user25TonTx} TON transactions`);
    console.log(`   User 227: ${user227TonTx} TON transactions`);
    
    if (user227TonTx > user25TonTx) {
      console.log(`⚠️  ANOMALY: User 227 has more TON transactions despite User 25 being the depositor`);
    }
  }

  // STEP 7: System State Analysis
  console.log('\n7️⃣ SYSTEM STATE ANALYSIS');
  console.log('-'.repeat(50));

  // Check enum types
  const { data: enumData, error: enumError } = await supabase
    .rpc('get_enum_values', { enum_name: 'transaction_type' });

  if (!enumError && enumData) {
    console.log(`📋 Available transaction types: ${enumData.join(', ')}`);
    
    if (!enumData.includes('TON_DEPOSIT')) {
      console.log(`⚠️  WARNING: TON_DEPOSIT type not found in enum`);
    } else {
      console.log(`✅ TON_DEPOSIT type available in database`);
    }
  }

  // Check for any orphaned transactions
  const { data: orphanedTx, error: orphanError } = await supabase
    .from('transactions')
    .select('id, user_id, type, amount, created_at')
    .or(`user_id.eq.25,user_id.eq.227`)
    .eq('status', 'COMPLETED')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!orphanError) {
    console.log(`🔍 All User 25/227 completed transactions: ${orphanedTx?.length || 0}`);
    
    const user25Tx = orphanedTx?.filter(tx => tx.user_id === 25) || [];
    const user227Tx = orphanedTx?.filter(tx => tx.user_id === 227) || [];
    
    console.log(`   User 25: ${user25Tx.length} completed transactions`);
    console.log(`   User 227: ${user227Tx.length} completed transactions`);
  }

  // STEP 8: Final Technical Assessment
  console.log('\n8️⃣ FINAL TECHNICAL ASSESSMENT');
  console.log('-'.repeat(50));

  console.log('🎯 DIAGNOSTIC CONCLUSIONS:');
  console.log('');

  if (user25?.usernameCollision) {
    console.log('❌ CRITICAL: Username collision between Users 25 and 227');
    console.log('   Impact: JWT authentication may route deposits to wrong account');
  }

  if (user25?.balanceMismatch || user227?.balanceMismatch) {
    console.log('❌ CRITICAL: Balance mismatch detected between transactions and user record');
  }

  const user25Balance = user25?.userRecord?.balance_ton || 0;
  const user227Balance = user227?.userRecord?.balance_ton || 0;

  if (user227Balance > user25Balance) {
    console.log('⚠️  ANOMALY: User 227 has higher TON balance than User 25');
    console.log('   This suggests deposits are incorrectly credited to User 227');
  }

  console.log('');
  console.log('📊 BALANCE SUMMARY:');
  console.log(`   User 25 (intended recipient): ${user25Balance} TON`);
  console.log(`   User 227 (collision victim): ${user227Balance} TON`);
  console.log('');

  // Generate recommendations
  console.log('💡 TECHNICAL RECOMMENDATIONS:');
  console.log('');

  if (user25?.usernameCollision) {
    console.log('1. Fix JWT authentication to use telegram_id instead of username');
    console.log('2. Migrate misplaced transactions from User 227 to User 25');
    console.log('3. Update balance calculations to reflect correct ownership');
  }

  console.log('');
  console.log('📝 DIAGNOSTIC COMPLETED');
  console.log(`Finished at: ${new Date().toISOString()}`);
  
  return diagnosticResults;
}

// Execute diagnostic
comprehensiveTonBalanceDiagnostic()
  .then(results => {
    console.log('\n✅ Diagnostic completed successfully');
    console.log(`Results saved for ${Object.keys(results).length} users`);
  })
  .catch(error => {
    console.error('❌ Diagnostic failed:', error);
  });