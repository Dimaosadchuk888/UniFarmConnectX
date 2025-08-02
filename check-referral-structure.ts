import { supabase } from './core/supabaseClient';

async function checkReferralStructure() {
  console.log('=== ДЕТАЛЬНАЯ ПРОВЕРКА РЕФЕРАЛЬНОЙ СТРУКТУРЫ ===\n');
  
  // 1. Проверяем, кто является реферером для User 184
  console.log('1. User 184 КАК РЕФЕРАЛ (чей он реферал):');
  const { data: asReferral } = await supabase
    .from('referrals')
    .select('*')
    .eq('referred_id', 184);
    
  if (asReferral && asReferral.length > 0) {
    console.log('User 184 является рефералом для:');
    asReferral.forEach(ref => {
      console.log(`├── User ${ref.referrer_id} (уровень ${ref.level})`);
    });
  } else {
    console.log('❌ User 184 не является чьим-либо рефералом\n');
  }
  
  // 2. Проверяем его как реферера
  console.log('\n2. User 184 КАК РЕФЕРЕР (его рефералы):');
  const { data: asReferrer } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', 184);
    
  if (asReferrer && asReferrer.length > 0) {
    console.log(`У User 184 есть ${asReferrer.length} рефералов:`);
    asReferrer.forEach(ref => {
      console.log(`├── User ${ref.referred_id} (уровень ${ref.level})`);
    });
  } else {
    console.log('❌ У User 184 нет рефералов\n');
  }
  
  // 3. Проверяем REFERRAL_REWARD транзакции User 184
  console.log('\n3. ПАРТНЕРСКИЕ НАЧИСЛЕНИЯ User 184:');
  const { data: referralRewards } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .eq('type', 'REFERRAL_REWARD')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (referralRewards && referralRewards.length > 0) {
    console.log(`Найдено ${referralRewards.length} партнерских начислений:`);
    
    let totalUni = 0;
    let totalTon = 0;
    
    referralRewards.forEach(tx => {
      console.log(`\n├── ${tx.description}`);
      console.log(`│   Сумма: ${tx.amount} ${tx.currency}`);
      console.log(`│   Дата: ${tx.created_at}`);
      
      if (tx.currency === 'UNI') totalUni += parseFloat(tx.amount);
      if (tx.currency === 'TON') totalTon += parseFloat(tx.amount);
    });
    
    console.log(`\nИТОГО ПОЛУЧЕНО:`);
    console.log(`├── UNI: ${totalUni.toFixed(6)} UNI`);
    console.log(`└── TON: ${totalTon.toFixed(6)} TON`);
  } else {
    console.log('❌ Партнерских начислений не найдено');
  }
  
  // 4. Анализ UNI рефералов из описаний
  console.log('\n4. АНАЛИЗ ИСТОЧНИКОВ UNI ПАРТНЕРСКИХ:');
  if (referralRewards && referralRewards.length > 0) {
    const sources = new Set();
    referralRewards.forEach(tx => {
      const match = tx.description.match(/from User (\d+)/);
      if (match) {
        sources.add(match[1]);
      }
    });
    
    if (sources.size > 0) {
      console.log('Вы получаете партнерские от этих пользователей:');
      sources.forEach(userId => {
        console.log(`├── User ${userId}`);
      });
      console.log('\n⚠️ Это означает, что ВЫ являетесь их рефералом!');
      console.log('   Вы получаете % от их доходов, а не от своих рефералов.');
    }
  }
}

checkReferralStructure();