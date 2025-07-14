/**
 * Phase 3.2: Перерасчет балансов фарминга
 * Проверяет соответствие балансов суммам транзакций
 */

import { supabase } from '../core/supabase';

interface UserBalance {
  userId: number;
  username: string;
  currentBalance: number;
  depositSum: number;
  rewardSum: number;
  expectedBalance: number;
  difference: number;
  needsCorrection: boolean;
}

async function recalculateFarmingBalances() {
  console.log('=== PHASE 3.2: RECALCULATE FARMING BALANCES ===\n');
  
  // 1. Получить всех активных фармеров
  const { data: farmers, error: fetchError } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, uni_deposit_amount, uni_farming_active')
    .eq('uni_farming_active', true)
    .order('id');
    
  if (fetchError) {
    console.error('Error fetching farmers:', fetchError);
    return;
  }
  
  console.log(`Found ${farmers?.length || 0} active farmers\n`);
  
  if (!farmers || farmers.length === 0) {
    console.log('No active farmers found.');
    return;
  }
  
  const results: UserBalance[] = [];
  let needsCorrection = 0;
  
  // 2. Для каждого фармера посчитать транзакции
  for (const farmer of farmers) {
    console.log(`Processing user ${farmer.id} (${farmer.username || farmer.telegram_id})...`);
    
    // Получить все FARMING_DEPOSIT транзакции
    const { data: deposits, error: depositError } = await supabase
      .from('transactions')
      .select('amount_uni')
      .eq('user_id', farmer.id)
      .eq('type', 'FARMING_DEPOSIT')
      .eq('status', 'completed');
      
    if (depositError) {
      console.error(`  Error fetching deposits:`, depositError);
      continue;
    }
    
    // Получить все FARMING_REWARD транзакции
    const { data: rewards, error: rewardError } = await supabase
      .from('transactions')
      .select('amount_uni')
      .eq('user_id', farmer.id)
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'UNI')
      .eq('status', 'completed');
      
    if (rewardError) {
      console.error(`  Error fetching rewards:`, rewardError);
      continue;
    }
    
    // Получить все другие транзакции влияющие на баланс
    const { data: otherTransactions, error: otherError } = await supabase
      .from('transactions')
      .select('type, amount_uni')
      .eq('user_id', farmer.id)
      .eq('currency', 'UNI')
      .eq('status', 'completed')
      .not('type', 'in', '(FARMING_DEPOSIT,FARMING_REWARD)');
      
    // Подсчет сумм
    const depositSum = deposits?.reduce((sum, t) => sum + parseFloat(t.amount_uni || '0'), 0) || 0;
    const rewardSum = rewards?.reduce((sum, t) => sum + parseFloat(t.amount_uni || '0'), 0) || 0;
    
    // Начальный баланс (если был)
    const initialBalance = 0; // Можно добавить логику для определения начального баланса
    
    // Ожидаемый баланс = начальный - депозиты + награды + другие транзакции
    const expectedBalance = initialBalance - depositSum + rewardSum;
    const currentBalance = parseFloat(farmer.balance_uni || '0');
    const difference = currentBalance - expectedBalance;
    
    const result: UserBalance = {
      userId: farmer.id,
      username: farmer.username || farmer.telegram_id,
      currentBalance,
      depositSum,
      rewardSum,
      expectedBalance,
      difference,
      needsCorrection: Math.abs(difference) > 0.01 // Погрешность 0.01 UNI
    };
    
    results.push(result);
    
    if (result.needsCorrection) {
      needsCorrection++;
      console.log(`  ⚠️  DISCREPANCY FOUND!`);
      console.log(`     Current balance: ${currentBalance.toFixed(6)} UNI`);
      console.log(`     Total deposits: ${depositSum.toFixed(6)} UNI`);
      console.log(`     Total rewards: ${rewardSum.toFixed(6)} UNI`);
      console.log(`     Expected balance: ${expectedBalance.toFixed(6)} UNI`);
      console.log(`     Difference: ${difference > 0 ? '+' : ''}${difference.toFixed(6)} UNI`);
    } else {
      console.log(`  ✓ Balance correct`);
    }
  }
  
  // 3. Вывести отчет
  console.log(`\n=== BALANCE VERIFICATION SUMMARY ===`);
  console.log(`Total farmers checked: ${results.length}`);
  console.log(`Farmers with correct balances: ${results.length - needsCorrection}`);
  console.log(`Farmers needing correction: ${needsCorrection}`);
  
  if (needsCorrection > 0) {
    console.log(`\n=== USERS NEEDING CORRECTION ===`);
    const discrepancies = results.filter(r => r.needsCorrection);
    
    for (const user of discrepancies) {
      console.log(`\nUser ${user.userId} (${user.username}):`);
      console.log(`  Current: ${user.currentBalance.toFixed(6)} UNI`);
      console.log(`  Expected: ${user.expectedBalance.toFixed(6)} UNI`);
      console.log(`  Difference: ${user.difference > 0 ? '+' : ''}${user.difference.toFixed(6)} UNI`);
      console.log(`  (Deposits: ${user.depositSum.toFixed(6)}, Rewards: ${user.rewardSum.toFixed(6)})`);
    }
    
    // Сохранить отчет в файл
    const fs = await import('fs/promises');
    const reportPath = `phase3_balance_report_${new Date().toISOString().split('T')[0]}.json`;
    await fs.writeFile(reportPath, JSON.stringify(discrepancies, null, 2));
    console.log(`\nDetailed report saved to: ${reportPath}`);
  }
  
  console.log(`\n✅ Phase 3.2 complete!`);
}

// Запуск перерасчета
recalculateFarmingBalances().catch(console.error);