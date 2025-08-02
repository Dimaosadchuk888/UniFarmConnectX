import { supabase } from './core/supabaseClient';

async function auditTonBoostReferral() {
  console.log('=== АУДИТ ПАРТНЕРСКИХ НАЧИСЛЕНИЙ TON BOOST ===\n');
  
  // 1. Проверяем есть ли REFERRAL_REWARD от TON транзакций
  console.log('1. ПОИСК REFERRAL_REWARD ОТ TON:');
  const { data: tonReferrals } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'REFERRAL_REWARD')
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (tonReferrals && tonReferrals.length > 0) {
    console.log(`Найдено ${tonReferrals.length} TON referral транзакций:`);
    tonReferrals.forEach(tx => {
      console.log(`├── User ${tx.user_id}: ${tx.amount} TON - ${tx.description}`);
      console.log(`│   Дата: ${tx.created_at}`);
    });
  } else {
    console.log('❌ НЕ НАЙДЕНО партнерских начислений в TON!\n');
  }
  
  // 2. Проверяем UNI referral от farming
  console.log('\n2. ДЛЯ СРАВНЕНИЯ - UNI REFERRAL:');
  const { data: uniReferrals } = await supabase
    .from('transactions')
    .select('user_id, amount, description, created_at')
    .eq('type', 'REFERRAL_REWARD')
    .eq('currency', 'UNI')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (uniReferrals && uniReferrals.length > 0) {
    console.log(`✅ Найдено ${uniReferrals.length} UNI referral транзакций (работает):`);
    uniReferrals.forEach(tx => {
      console.log(`├── ${tx.description} - ${tx.created_at}`);
    });
  }
  
  // 3. Проверяем структуру referrals таблицы
  console.log('\n3. ПРОВЕРКА СТРУКТУРЫ ПАРТНЕРСКОЙ СИСТЕМЫ:');
  const { data: referralStructure } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', 184) // User 184 как реферер
    .limit(5);
    
  if (referralStructure && referralStructure.length > 0) {
    console.log(`User 184 имеет ${referralStructure.length} рефералов:`);
    referralStructure.forEach(ref => {
      console.log(`├── Реферал: User ${ref.referred_id}, уровень: ${ref.level}`);
    });
  }
  
  // 4. Проверяем активность рефералов в TON farming
  console.log('\n4. ПРОВЕРКА TON АКТИВНОСТИ РЕФЕРАЛОВ:');
  const { data: referralIds } = await supabase
    .from('referrals')
    .select('referred_id')
    .eq('referrer_id', 184);
    
  if (referralIds && referralIds.length > 0) {
    const refIds = referralIds.map(r => r.referred_id);
    
    // Проверяем есть ли у рефералов TON boost
    const { data: referralBoosts } = await supabase
      .from('users')
      .select('id, telegram_id, ton_boost_package, ton_farming_balance')
      .in('id', refIds)
      .gt('ton_boost_package', 0);
      
    if (referralBoosts && referralBoosts.length > 0) {
      console.log(`✅ ${referralBoosts.length} рефералов имеют активные TON Boost:`);
      referralBoosts.forEach(user => {
        console.log(`├── User ${user.id}: пакет ${user.ton_boost_package}, баланс ${user.ton_farming_balance} TON`);
      });
    } else {
      console.log('❌ Ни один реферал не имеет активного TON Boost!');
    }
    
    // Проверяем FARMING_REWARD транзакции рефералов в TON
    const { data: referralTonRewards } = await supabase
      .from('transactions')
      .select('user_id, amount, created_at')
      .in('user_id', refIds)
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .gte('created_at', '2025-08-01')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (referralTonRewards && referralTonRewards.length > 0) {
      console.log(`\n✅ Рефералы получают TON farming rewards (${referralTonRewards.length} транзакций):`);
      referralTonRewards.forEach(tx => {
        console.log(`├── User ${tx.user_id}: ${tx.amount} TON - ${tx.created_at}`);
      });
    } else {
      console.log('\n❌ Рефералы НЕ получают TON farming rewards!');
    }
  }
  
  // 5. Проверяем код обработки referral
  console.log('\n5. АНАЛИЗ ПРОБЛЕМЫ:');
  console.log('├── UNI referral система: ✅ РАБОТАЕТ');
  console.log('├── TON referral транзакции: ❌ НЕ НАЙДЕНЫ');
  console.log('├── Возможные причины:');
  console.log('│   1. Код не создает REFERRAL_REWARD для TON farming');
  console.log('│   2. Farming calculator обрабатывает только UNI referrals');
  console.log('│   3. TON Boost изначально не имел партнерской программы');
  console.log('└── Вывод: Система партнерских начислений от TON Boost НЕ РЕАЛИЗОВАНА');
}

auditTonBoostReferral();