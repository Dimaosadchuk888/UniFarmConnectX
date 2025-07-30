import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pihyqubdxxmphhfajcct.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserBalances() {
  console.log('🔍 ПРОВЕРКА ВСЕХ TON БАЛАНСОВ ДЛЯ USER 184');
  console.log('='.repeat(60));

  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id,
      balance_ton,
      ton_farming_balance,
      ton_farming_accumulated,
      ton_farming_rate,
      ton_boost_active,
      ton_boost_package
    `)
    .eq('id', 184)
    .single();

  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }

  console.log('\n📊 БАЛАНСЫ USER 184:');
  console.log('├─ balance_ton:', user.balance_ton);
  console.log('├─ ton_farming_balance:', user.ton_farming_balance);
  console.log('├─ ton_farming_accumulated:', user.ton_farming_accumulated);
  console.log('├─ ton_farming_rate:', user.ton_farming_rate);
  console.log('├─ ton_boost_active:', user.ton_boost_active);
  console.log('└─ ton_boost_package:', user.ton_boost_package);

  // Проверяем суммы
  const sum1 = parseFloat(user.balance_ton || '0') + parseFloat(user.ton_farming_balance || '0');
  const sum2 = parseFloat(user.balance_ton || '0') + parseFloat(user.ton_farming_accumulated || '0');
  const sum3 = parseFloat(user.balance_ton || '0') + parseFloat(user.ton_farming_balance || '0') + parseFloat(user.ton_farming_accumulated || '0');

  console.log('\n🧮 ВОЗМОЖНЫЕ СУММЫ:');
  console.log(`├─ balance_ton + ton_farming_balance = ${sum1.toFixed(6)}`);
  console.log(`├─ balance_ton + ton_farming_accumulated = ${sum2.toFixed(6)}`);
  console.log(`└─ balance_ton + ton_farming_balance + ton_farming_accumulated = ${sum3.toFixed(6)}`);

  console.log('\n🎯 API ВОЗВРАЩАЕТ: 3.121989 TON');

  // Проверяем ton_farming_data
  const { data: farmingData, error: farmingError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', '184')
    .single();

  if (!farmingError && farmingData) {
    console.log('\n📦 TON_FARMING_DATA:');
    console.log('├─ farming_balance:', farmingData.farming_balance);
    console.log('├─ farming_rate:', farmingData.farming_rate);
    console.log('└─ boost_active:', farmingData.boost_active);
  }
}

checkUserBalances();
