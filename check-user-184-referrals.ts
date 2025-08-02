import { supabase } from './core/supabaseClient';

async function checkUser184Referrals() {
  console.log('=== ПРОВЕРКА РЕФЕРАЛОВ USER 184 ===\n');
  
  // 1. Получаем всех рефералов User 184
  console.log('1. РЕФЕРАЛЫ USER 184:');
  const { data: referrals } = await supabase
    .from('referrals')
    .select('referred_id, level')
    .eq('referrer_id', 184)
    .order('level', { ascending: true });
    
  if (!referrals || referrals.length === 0) {
    console.log('❌ У User 184 нет рефералов!');
    return;
  }
  
  console.log(`Найдено ${referrals.length} рефералов\n`);
  
  // 2. Проверяем их TON активность
  const refIds = referrals.map(r => r.referred_id);
  
  console.log('2. TON BOOST АКТИВНОСТЬ РЕФЕРАЛОВ:');
  const { data: refUsers } = await supabase
    .from('users')
    .select('id, telegram_id, username, ton_boost_package, ton_farming_balance, balance_ton')
    .in('id', refIds);
    
  let tonBoostCount = 0;
  let activeTonFarmers = 0;
  
  if (refUsers) {
    refUsers.forEach(user => {
      const level = referrals.find(r => r.referred_id === user.id)?.level || 0;
      
      if (user.ton_boost_package > 0) {
        tonBoostCount++;
        console.log(`✅ L${level} User ${user.id} (@${user.username}):`);
        console.log(`   ├── TON Boost пакет: ${user.ton_boost_package}`);
        console.log(`   ├── TON farming balance: ${user.ton_farming_balance} TON`);
        console.log(`   └── Основной баланс: ${user.balance_ton} TON`);
        
        if (parseFloat(user.ton_farming_balance) > 0) {
          activeTonFarmers++;
        }
      }
    });
    
    console.log(`\nИТОГО:`);
    console.log(`├── Всего рефералов: ${referrals.length}`);
    console.log(`├── С TON Boost пакетами: ${tonBoostCount}`);
    console.log(`└── С активным TON farming: ${activeTonFarmers}\n`);
  }
  
  // 3. Проверяем последние FARMING_REWARD в TON от рефералов
  console.log('3. ПОСЛЕДНИЕ TON FARMING REWARD ОТ РЕФЕРАЛОВ:');
  const { data: tonRewards } = await supabase
    .from('transactions')
    .select('user_id, amount, created_at')
    .in('user_id', refIds)
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (tonRewards && tonRewards.length > 0) {
    console.log('Последние TON farming транзакции рефералов:');
    tonRewards.forEach(tx => {
      console.log(`├── User ${tx.user_id}: ${tx.amount} TON - ${tx.created_at}`);
    });
  } else {
    console.log('❌ Рефералы не получают TON farming rewards!');
  }
  
  // 4. Почему нет партнерских
  console.log('\n4. АНАЛИЗ:');
  if (tonBoostCount === 0) {
    console.log('❌ НИ ОДИН из ваших рефералов не купил TON Boost!');
    console.log('   Поэтому вы не получаете партнерские от TON farming.');
  } else if (activeTonFarmers === 0) {
    console.log('⚠️ Есть рефералы с TON Boost, но у них пустой farming balance!');
    console.log('   Возможно, они купили пакет, но не сделали депозит.');
  } else {
    console.log('✅ У вас есть активные TON farming рефералы.');
    console.log('   Проверьте транзакции REFERRAL_REWARD в TON.');
  }
}

checkUser184Referrals();