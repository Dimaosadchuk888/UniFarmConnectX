import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkUser48() {
  console.log('\n=== ИССЛЕДОВАНИЕ USER_ID=48 ===\n');
  
  // 1. Проверка пользователя
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', 48)
    .single();
    
  if (userError) {
    console.log('❌ Ошибка получения пользователя:', userError);
    return;
  }
  
  console.log('👤 ДАННЫЕ ПОЛЬЗОВАТЕЛЯ 48:');
  console.log('ID:', user.id);
  console.log('Telegram ID:', user.telegram_id);
  console.log('Username:', user.username);
  console.log('First Name:', user.first_name);
  console.log('Last Name:', user.last_name);
  console.log('Ref Code:', user.ref_code);
  console.log('UNI Balance:', user.balance_uni);
  console.log('TON Balance:', user.balance_ton);
  console.log('TON Boost Package:', user.ton_boost_package);
  console.log('Is Active:', user.is_active);
  console.log('Banned:', user.banned);
  console.log('UNI Farming Active:', user.uni_farming_start_timestamp ? true : false);
  console.log('Created At:', user.created_at);
  
  // 2. Проверка транзакций
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 48)
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('\n📊 ПОСЛЕДНИЕ ТРАНЗАКЦИИ:');
  if (transactions && transactions.length > 0) {
    transactions.forEach(tx => {
      console.log(`- ${tx.type}: ${tx.amount} ${tx.currency} (${new Date(tx.created_at).toLocaleString()})`);
    });
  } else {
    console.log('Транзакций не найдено');
  }
  
  // 3. Проверка boost покупок
  const { data: boostPurchases } = await supabase
    .from('boost_purchases')
    .select('*')
    .eq('user_id', 48)
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('\n🚀 BOOST ПОКУПКИ:');
  if (boostPurchases && boostPurchases.length > 0) {
    boostPurchases.forEach(boost => {
      console.log(`- ${boost.package_name}: ${boost.amount} TON (${boost.status})`);
    });
  } else {
    console.log('Boost покупок не найдено');
  }
  
  // 4. Проверка рефералов
  const { data: referrals } = await supabase
    .from('users')
    .select('id, username, created_at')
    .eq('referred_by', 48);
    
  console.log('\n👥 РЕФЕРАЛЫ:');
  console.log('Количество рефералов:', referrals?.length || 0);
}

checkUser48().catch(console.error);