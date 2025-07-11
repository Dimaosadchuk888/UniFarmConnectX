import { supabase } from './core/supabase';

async function analyzeDeposits() {
  console.log('=== АНАЛИЗ ДЕПОЗИТОВ ПОЛЬЗОВАТЕЛЯ 74 ===\n');
  
  // Данные из uni_farming_data
  const { data: farmingData, error: farmingError } = await supabase
    .from('uni_farming_data')
    .select('*')
    .eq('user_id', 74)
    .single();
    
  // Данные из users
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', 74)
    .single();
    
  console.log('📊 ТАБЛИЦА uni_farming_data:');
  console.log('- deposit_amount:', farmingData?.deposit_amount);
  console.log('- farming_deposit:', farmingData?.farming_deposit);
  console.log('- is_active:', farmingData?.is_active);
  console.log('- farming_rate:', farmingData?.farming_rate);
  console.log('- updated_at:', farmingData?.updated_at);
  
  console.log('\n📊 ТАБЛИЦА users:');
  console.log('- balance_uni:', userData?.balance_uni);
  console.log('- uni_deposit_amount:', userData?.uni_deposit_amount);
  console.log('- uni_farming_deposit:', userData?.uni_farming_deposit);
  console.log('- uni_farming_active:', userData?.uni_farming_active);
  
  console.log('\n✅ АНАЛИЗ:');
  const depositDiff = parseFloat(farmingData?.deposit_amount || '0') - 407329;
  console.log('- Изменение депозита в uni_farming_data:', depositDiff, 'UNI');
  console.log('- Баланс уменьшился на:', 360180.122573 - userData?.balance_uni, 'UNI');
  console.log('- Синхронизация таблиц:', 
    farmingData?.deposit_amount === userData?.uni_deposit_amount ? '✅ УСПЕШНО' : '❌ ОШИБКА');
  
  // Последние транзакции
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .eq('type', 'FARMING_DEPOSIT')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('\n📜 ПОСЛЕДНИЕ ТРАНЗАКЦИИ ДЕПОЗИТОВ:');
  transactions?.forEach(tx => {
    console.log(`- ${tx.created_at}: ${tx.amount_uni} UNI (${tx.description})`);
  });
}

analyzeDeposits().catch(console.error);