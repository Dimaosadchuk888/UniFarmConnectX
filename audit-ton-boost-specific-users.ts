import { supabase } from './core/supabaseClient';

async function auditTonBoostSpecificUsers() {
  console.log('=== ПРОВЕРКА TON BOOST У ПОЛЬЗОВАТЕЛЕЙ 186-190 ===\n');
  
  const targetUsers = [186, 187, 188, 189, 190];
  
  // 1. Проверяем их TON Boost статус
  console.log('1. СТАТУС TON BOOST ПАКЕТОВ:');
  const { data: users } = await supabase
    .from('users')
    .select('id, telegram_id, username, ton_boost_package, ton_farming_balance, balance_ton')
    .in('id', targetUsers)
    .order('id');
    
  if (users) {
    users.forEach(user => {
      console.log(`\nUser ${user.id} (@${user.username}):`);
      console.log(`├── TON Boost пакет: ${user.ton_boost_package > 0 ? `✅ Пакет ${user.ton_boost_package}` : '❌ НЕТ'}`);
      console.log(`├── TON farming balance: ${user.ton_farming_balance} TON`);
      console.log(`└── Основной баланс TON: ${user.balance_ton} TON`);
    });
  }
  
  // 2. Проверяем их последние TON farming rewards
  console.log('\n\n2. ПОСЛЕДНИЕ TON FARMING REWARDS:');
  const { data: tonRewards } = await supabase
    .from('transactions')
    .select('user_id, amount, created_at, description')
    .in('user_id', targetUsers)
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(20);
    
  if (tonRewards && tonRewards.length > 0) {
    console.log(`Найдено ${tonRewards.length} TON farming транзакций:`);
    tonRewards.forEach(tx => {
      console.log(`├── User ${tx.user_id}: ${tx.amount} TON - ${tx.created_at}`);
    });
  } else {
    console.log('❌ НЕ НАЙДЕНО TON farming rewards от этих пользователей!');
  }
  
  // 3. Проверяем историю REFERRAL_REWARD в TON для User 184
  console.log('\n\n3. ИСТОРИЯ TON ПАРТНЕРСКИХ ДЛЯ USER 184:');
  const { data: historicalTonReferrals } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .eq('type', 'REFERRAL_REWARD')
    .eq('currency', 'TON')
    .order('created_at', { ascending: false });
    
  if (historicalTonReferrals && historicalTonReferrals.length > 0) {
    console.log(`✅ НАЙДЕНО ${historicalTonReferrals.length} исторических TON партнерских:`);
    historicalTonReferrals.forEach(tx => {
      console.log(`\n├── ${tx.description}`);
      console.log(`│   Сумма: ${tx.amount} TON`);
      console.log(`│   Дата: ${tx.created_at}`);
    });
    
    // Анализируем когда прекратились
    const lastDate = new Date(historicalTonReferrals[0].created_at);
    const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`\n⚠️ Последнее начисление было ${daysSince} дней назад!`);
  } else {
    console.log('❌ НЕ НАЙДЕНО исторических TON партнерских для User 184');
  }
  
  // 4. Проверяем связь в таблице referrals
  console.log('\n\n4. ПРОВЕРКА РЕФЕРАЛЬНЫХ СВЯЗЕЙ:');
  
  // Проверяем прямую связь
  for (const userId of targetUsers) {
    const { data: referralLink } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId)
      .eq('referred_id', 184)
      .single();
      
    if (referralLink) {
      console.log(`✅ User ${userId} → User 184 (уровень ${referralLink.level})`);
    }
  }
  
  // Проверяем обратную связь
  const { data: reverseLinks } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', 184)
    .in('referred_id', targetUsers);
    
  if (reverseLinks && reverseLinks.length > 0) {
    console.log('\nОбратные связи (184 как реферер):');
    reverseLinks.forEach(link => {
      console.log(`├── User 184 → User ${link.referred_id} (уровень ${link.level})`);
    });
  }
  
  // 5. Проверяем текущие UNI партнерские для сравнения
  console.log('\n\n5. ТЕКУЩИЕ UNI ПАРТНЕРСКИЕ (ДЛЯ СРАВНЕНИЯ):');
  const { data: recentUniReferrals } = await supabase
    .from('transactions')
    .select('amount, description, created_at')
    .eq('user_id', 184)
    .eq('type', 'REFERRAL_REWARD')
    .eq('currency', 'UNI')
    .like('description', '%from User 18%') // 186-190
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (recentUniReferrals && recentUniReferrals.length > 0) {
    console.log('✅ UNI партнерские продолжают поступать:');
    recentUniReferrals.forEach(tx => {
      console.log(`├── ${tx.description} - ${tx.created_at}`);
    });
  }
}

auditTonBoostSpecificUsers();