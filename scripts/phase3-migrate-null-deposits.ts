/**
 * Phase 3.1: Миграция пользователей с NULL депозитами
 * Восстанавливает uni_deposit_amount из транзакций FARMING_DEPOSIT
 */

import { supabase } from '../core/supabase';

async function migrateNullDeposits() {
  console.log('=== PHASE 3.1: MIGRATE NULL DEPOSITS ===\n');
  
  // 1. Найти всех пользователей с NULL uni_deposit_amount но active farming
  const { data: nullDepositUsers, error: fetchError } = await supabase
    .from('users')
    .select('id, telegram_id, username, uni_farming_active, uni_deposit_amount')
    .eq('uni_farming_active', true)
    .or('uni_deposit_amount.is.null,uni_deposit_amount.eq.0');
    
  if (fetchError) {
    console.error('Error fetching users:', fetchError);
    return;
  }
  
  console.log(`Found ${nullDepositUsers?.length || 0} users with NULL/0 deposits but active farming\n`);
  
  if (!nullDepositUsers || nullDepositUsers.length === 0) {
    console.log('✅ No users with NULL deposits found. Phase 3.1 complete.');
    return;
  }
  
  // 2. Для каждого пользователя проверить транзакции FARMING_DEPOSIT
  let fixed = 0;
  let notFixed = 0;
  
  for (const user of nullDepositUsers) {
    console.log(`\nProcessing user ${user.id} (${user.username || user.telegram_id}):`);
    
    // Получить все FARMING_DEPOSIT транзакции
    const { data: deposits, error: depositError } = await supabase
      .from('transactions')
      .select('amount_uni, created_at')
      .eq('user_id', user.id)
      .eq('type', 'FARMING_DEPOSIT')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
      
    if (depositError) {
      console.error(`  Error fetching deposits:`, depositError);
      notFixed++;
      continue;
    }
    
    if (!deposits || deposits.length === 0) {
      console.log(`  No FARMING_DEPOSIT transactions found`);
      
      // Установить uni_deposit_amount = 0
      const { error: updateError } = await supabase
        .from('users')
        .update({ uni_deposit_amount: '0' })
        .eq('id', user.id);
        
      if (updateError) {
        console.error(`  Error setting deposit to 0:`, updateError);
        notFixed++;
      } else {
        console.log(`  ✓ Set uni_deposit_amount = 0`);
        fixed++;
      }
      continue;
    }
    
    // Суммировать все депозиты
    const totalDeposit = deposits.reduce((sum, dep) => {
      return sum + parseFloat(dep.amount_uni || '0');
    }, 0);
    
    console.log(`  Found ${deposits.length} deposits, total: ${totalDeposit.toFixed(6)} UNI`);
    
    // Обновить uni_deposit_amount
    const { error: updateError } = await supabase
      .from('users')
      .update({ uni_deposit_amount: totalDeposit.toString() })
      .eq('id', user.id);
      
    if (updateError) {
      console.error(`  Error updating deposit amount:`, updateError);
      notFixed++;
    } else {
      console.log(`  ✓ Restored uni_deposit_amount = ${totalDeposit.toFixed(6)}`);
      fixed++;
    }
  }
  
  console.log(`\n=== MIGRATION SUMMARY ===`);
  console.log(`Total users processed: ${nullDepositUsers.length}`);
  console.log(`Successfully fixed: ${fixed}`);
  console.log(`Failed to fix: ${notFixed}`);
  console.log(`\n✅ Phase 3.1 complete!`);
}

// Запуск миграции
migrateNullDeposits().catch(console.error);