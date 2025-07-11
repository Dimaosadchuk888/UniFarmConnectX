import { supabase } from './core/supabase';

async function checkDatabaseSyncIssues() {
  console.log('=== АНАЛИЗ СИНХРОНИЗАЦИИ МЕЖДУ ТАБЛИЦАМИ БД ===\n');
  
  // Проверяем пользователя 74
  const userId = 74;
  
  // 1. Данные из users
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
    
  // 2. Данные из uni_farming_data
  const { data: uniFarmingData } = await supabase
    .from('uni_farming_data')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  // 3. Данные из ton_farming_data (если есть)
  const { data: tonFarmingData } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  // 4. Все транзакции пользователя
  const { data: transactions } = await supabase
    .from('transactions')
    .select('type, amount_uni, amount_ton')
    .eq('user_id', userId)
    .in('type', ['FARMING_DEPOSIT', 'FARMING_INCOME', 'FARMING_REWARD']);
    
  console.log('🔍 1. СИНХРОНИЗАЦИЯ UNI FARMING:');
  console.log('users.uni_deposit_amount:', userData?.uni_deposit_amount);
  console.log('uni_farming_data.deposit_amount:', uniFarmingData?.deposit_amount);
  console.log('Синхронизация:', userData?.uni_deposit_amount === uniFarmingData?.deposit_amount ? '✅ OK' : '❌ ОШИБКА');
  
  console.log('\n🔍 2. СИНХРОНИЗАЦИЯ TON BOOST:');
  console.log('users.ton_boost_package:', userData?.ton_boost_package);
  console.log('users.ton_boost_active:', userData?.ton_boost_active);
  console.log('users.ton_farming_deposit:', userData?.ton_farming_deposit);
  if (tonFarmingData) {
    console.log('ton_farming_data.package_id:', tonFarmingData?.package_id);
    console.log('ton_farming_data.is_active:', tonFarmingData?.is_active);
    console.log('ton_farming_data.deposit_amount:', tonFarmingData?.deposit_amount);
  } else {
    console.log('❗ Таблица ton_farming_data пуста или не существует');
  }
  
  console.log('\n🔍 3. ПРОВЕРКА БАЛАНСОВ:');
  console.log('users.balance_uni:', userData?.balance_uni);
  console.log('users.balance_ton:', userData?.balance_ton);
  console.log('users.uni_farming_balance:', userData?.uni_farming_balance);
  console.log('users.ton_farming_balance:', userData?.ton_farming_balance);
  
  // Проверяем суммы транзакций
  console.log('\n🔍 4. ПРОВЕРКА ТРАНЗАКЦИЙ:');
  const { data: farmingDeposits } = await supabase
    .from('transactions')
    .select('amount_uni')
    .eq('user_id', userId)
    .eq('type', 'FARMING_DEPOSIT');
    
  const totalDeposits = farmingDeposits?.reduce((sum, tx) => sum + (tx.amount_uni || 0), 0) || 0;
  console.log('Сумма всех FARMING_DEPOSIT транзакций:', totalDeposits);
  console.log('Текущий депозит в uni_farming_data:', uniFarmingData?.deposit_amount);
  
  // Проверяем referrals
  console.log('\n🔍 5. ПРОВЕРКА REFERRAL ДАННЫХ:');
  const { data: referralData } = await supabase
    .from('referrals')
    .select('*')
    .or(`user_id.eq.${userId},inviter_id.eq.${userId}`);
    
  console.log('Количество рефералов:', referralData?.length || 0);
  console.log('users.referral_count:', userData?.referral_count);
  console.log('users.referral_earnings_uni:', userData?.referral_earnings_uni);
  console.log('users.referral_earnings_ton:', userData?.referral_earnings_ton);
  
  console.log('\n🔍 6. ПОТЕНЦИАЛЬНЫЕ ПРОБЛЕМЫ:');
  const issues = [];
  
  if (userData?.uni_deposit_amount !== uniFarmingData?.deposit_amount) {
    issues.push('❌ Рассинхронизация UNI депозитов между users и uni_farming_data');
  }
  
  if (userData?.ton_boost_active && !tonFarmingData) {
    issues.push('❌ TON Boost активен в users, но нет записи в ton_farming_data');
  }
  
  if (Math.abs(totalDeposits - (uniFarmingData?.deposit_amount || 0)) > 1) {
    issues.push('❌ Сумма транзакций не совпадает с текущим депозитом');
  }
  
  if (issues.length === 0) {
    console.log('✅ Все данные синхронизированы корректно!');
  } else {
    issues.forEach(issue => console.log(issue));
  }
}

checkDatabaseSyncIssues().catch(console.error);