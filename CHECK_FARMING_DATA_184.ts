import { supabase } from './server/supabase';

async function checkFarmingData() {
  console.log('🔍 ПРОВЕРКА TON_FARMING_DATA ДЛЯ USER 184');
  console.log('='.repeat(60));

  // Проверяем ton_farming_data
  const { data: farmingData, error: farmingError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', '184')
    .single();

  if (farmingError && farmingError.code !== 'PGRST116') {
    console.error('❌ Ошибка ton_farming_data:', farmingError);
  } else if (farmingData) {
    console.log('\n📦 TON_FARMING_DATA:');
    console.log('├─ user_id:', farmingData.user_id);
    console.log('├─ farming_balance:', farmingData.farming_balance);
    console.log('├─ farming_rate:', farmingData.farming_rate);
    console.log('├─ boost_active:', farmingData.boost_active);
    console.log('├─ last_calculation_time:', farmingData.last_calculation_time);
    console.log('└─ boost_package_id:', farmingData.boost_package_id);
    
    const farmingBalance = parseFloat(farmingData.farming_balance || '0');
    console.log('\n🧮 СУММА С BASE BALANCE:');
    console.log(`└─ 0.01 (balance_ton) + ${farmingBalance} (farming_balance) = ${(0.01 + farmingBalance).toFixed(6)}`);
  } else {
    console.log('\n❌ Нет записи в ton_farming_data для user 184');
  }

  // Проверяем транзакции TON Boost
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('amount, type, created_at')
    .eq('user_id', 184)
    .or('type.eq.BOOST_PURCHASE,type.eq.TON_DEPOSIT')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!txError && transactions) {
    console.log('\n📋 ПОСЛЕДНИЕ TON ТРАНЗАКЦИИ:');
    transactions.forEach(tx => {
      console.log(`├─ ${tx.type}: ${tx.amount} TON (${new Date(tx.created_at).toLocaleString()})`);
    });
  }

  console.log('\n🎯 ЦЕЛЬ: Найти откуда берется 3.121989 TON');
}

checkFarmingData();
