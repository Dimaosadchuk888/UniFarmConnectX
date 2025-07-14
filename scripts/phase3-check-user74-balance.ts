/**
 * Phase 3.2: Проверка баланса user 74
 * Детальный анализ транзакций и баланса
 */

import { supabase } from '../core/supabase';

async function checkUser74Balance() {
  console.log('=== PHASE 3.2: CHECK USER 74 BALANCE ===\n');
  
  // 1. Получить данные user 74
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', 74)
    .single();
    
  if (userError || !user) {
    console.error('Error fetching user 74:', userError);
    return;
  }
  
  console.log('User 74 current state:');
  console.log(`  Balance UNI: ${user.balance_uni}`);
  console.log(`  Deposit amount: ${user.uni_deposit_amount}`);
  console.log(`  Farming active: ${user.uni_farming_active}`);
  console.log(`  Last update: ${user.uni_farming_last_update}\n`);
  
  // 2. Получить все транзакции
  console.log('Analyzing transactions...\n');
  
  // FARMING_DEPOSIT транзакции
  const { data: deposits, error: depositError } = await supabase
    .from('transactions')
    .select('id, amount_uni, created_at, description')
    .eq('user_id', 74)
    .eq('type', 'FARMING_DEPOSIT')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (!depositError && deposits) {
    console.log(`FARMING_DEPOSIT transactions (last 10):`);
    let totalDeposits = 0;
    for (const dep of deposits) {
      const amount = parseFloat(dep.amount_uni || '0');
      totalDeposits += amount;
      console.log(`  ${dep.created_at}: ${amount.toFixed(6)} UNI`);
    }
    
    // Получить общую сумму всех депозитов
    const { data: allDeposits } = await supabase
      .from('transactions')
      .select('amount_uni')
      .eq('user_id', 74)
      .eq('type', 'FARMING_DEPOSIT')
      .eq('status', 'completed');
      
    const totalAllDeposits = allDeposits?.reduce((sum, d) => sum + parseFloat(d.amount_uni || '0'), 0) || 0;
    console.log(`  Total deposits: ${totalAllDeposits.toFixed(6)} UNI\n`);
  }
  
  // FARMING_REWARD транзакции
  const { data: rewards, error: rewardError } = await supabase
    .from('transactions')
    .select('id, amount_uni, created_at, description')
    .eq('user_id', 74)
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'UNI')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (!rewardError && rewards) {
    console.log(`FARMING_REWARD transactions (last 10):`);
    for (const reward of rewards) {
      const amount = parseFloat(reward.amount_uni || '0');
      console.log(`  ${reward.created_at}: ${amount.toFixed(6)} UNI - ${reward.description}`);
    }
    
    // Получить общую сумму всех наград
    const { data: allRewards } = await supabase
      .from('transactions')
      .select('amount_uni')
      .eq('user_id', 74)
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'UNI')
      .eq('status', 'completed');
      
    const totalAllRewards = allRewards?.reduce((sum, r) => sum + parseFloat(r.amount_uni || '0'), 0) || 0;
    console.log(`  Total rewards: ${totalAllRewards.toFixed(6)} UNI\n`);
  }
  
  // 3. Проверить последние транзакции на аномалии
  const { data: recentTransactions, error: recentError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'UNI')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (!recentError && recentTransactions) {
    console.log('Recent anomalous transactions check:');
    for (const tx of recentTransactions) {
      const amount = parseFloat(tx.amount_uni || '0');
      if (amount > 1000) {
        console.log(`  ⚠️  ANOMALY: Transaction ${tx.id} - ${amount.toFixed(6)} UNI at ${tx.created_at}`);
        console.log(`     Description: ${tx.description}`);
      }
    }
  }
  
  console.log('\n✅ User 74 balance check complete!');
}

// Запуск проверки
checkUser74Balance().catch(console.error);