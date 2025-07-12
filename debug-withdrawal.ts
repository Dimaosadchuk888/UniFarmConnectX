import { supabase } from './core/supabase';

async function debugWithdrawal() {
  console.log('=== Debug Withdrawal Issue ===');
  
  // 1. Check user by ID 74
  const { data: userById, error: userByIdError } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, balance_ton')
    .eq('id', 74)
    .single();
    
  console.log('\n1. User by ID 74:');
  if (userByIdError) {
    console.log('Error:', userByIdError);
  } else {
    console.log('Found:', userById);
  }
  
  // 2. Check user by telegram_id 999489
  const { data: userByTelegramId, error: userByTelegramIdError } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, balance_ton')
    .eq('telegram_id', 999489)
    .single();
    
  console.log('\n2. User by telegram_id 999489:');
  if (userByTelegramIdError) {
    console.log('Error:', userByTelegramIdError);
  } else {
    console.log('Found:', userByTelegramId);
  }
  
  // 3. Check if there are multiple users with telegram_id 999489
  const { data: allUsersWithTelegramId, error: allUsersError } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, balance_ton')
    .eq('telegram_id', 999489);
    
  console.log('\n3. All users with telegram_id 999489:');
  if (allUsersError) {
    console.log('Error:', allUsersError);
  } else {
    console.log('Found', allUsersWithTelegramId?.length, 'users:');
    allUsersWithTelegramId?.forEach(user => {
      console.log(`  - ID: ${user.id}, Username: ${user.username}, UNI: ${user.balance_uni}, TON: ${user.balance_ton}`);
    });
  }
  
  // 4. Test withdrawal calculation
  if (userByTelegramId) {
    const withdrawAmount = 1000; // UNI
    const commission = Math.ceil(withdrawAmount / 1000) * 0.1;
    const tonBalance = parseFloat(userByTelegramId.balance_ton || "0");
    
    console.log('\n4. Withdrawal calculation:');
    console.log(`  - Withdraw amount: ${withdrawAmount} UNI`);
    console.log(`  - Commission: ${commission} TON`);
    console.log(`  - User TON balance: ${tonBalance}`);
    console.log(`  - Sufficient balance: ${tonBalance >= commission}`);
    console.log(`  - Raw balance_ton value: "${userByTelegramId.balance_ton}"`);
  }
}

debugWithdrawal().catch(console.error);