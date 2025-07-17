/**
 * Проверка реферальных начислений от UNI фарминга
 */

import { supabase } from '../core/supabase';

async function checkUniReferralRewards() {
  console.log('\n=== ПРОВЕРКА РЕФЕРАЛЬНЫХ НАЧИСЛЕНИЙ ОТ UNI ФАРМИНГА ===\n');
  
  // 1. Проверяем UNI реферальные транзакции за последние 2 часа
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  
  const { data: uniReferralTx, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .eq('type', 'REFERRAL_REWARD')
    .eq('currency', 'UNI')
    .gte('created_at', twoHoursAgo)
    .order('created_at', { ascending: false });
    
  if (txError) {
    console.error('Ошибка получения транзакций:', txError);
    return;
  }
  
  console.log('📊 UNI реферальные транзакции за последние 2 часа:');
  console.log('Количество:', uniReferralTx?.length || 0);
  
  if (uniReferralTx && uniReferralTx.length > 0) {
    let totalUniReferral = 0;
    
    uniReferralTx.forEach((tx, index) => {
      console.log(`\n${index + 1}. Транзакция ID: ${tx.id}`);
      console.log(`   Время: ${tx.created_at}`);
      console.log(`   UNI: ${tx.amount_uni}`);
      console.log(`   Описание: ${tx.description}`);
      
      totalUniReferral += parseFloat(tx.amount_uni || '0');
    });
    
    console.log(`\n💰 ИТОГО UNI реферальных: ${totalUniReferral}`);
  } else {
    console.log('❌ Нет UNI реферальных транзакций!');
  }
  
  // 2. Проверяем ВСЕ реферальные транзакции (UNI и TON)
  const { data: allReferralTx, error: allError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .eq('type', 'REFERRAL_REWARD')
    .gte('created_at', twoHoursAgo)
    .order('created_at', { ascending: false })
    .limit(20);
    
  console.log('\n\n📋 ВСЕ реферальные транзакции (последние 20):');
  if (allReferralTx && allReferralTx.length > 0) {
    // Группируем по валютам
    const byCurrency: Record<string, number> = {};
    
    allReferralTx.forEach(tx => {
      const currency = tx.currency || 'UNKNOWN';
      byCurrency[currency] = (byCurrency[currency] || 0) + 1;
    });
    
    console.log('\nПо валютам:');
    Object.entries(byCurrency).forEach(([curr, count]) => {
      console.log(`- ${curr}: ${count} транзакций`);
    });
    
    console.log('\nПоследние транзакции:');
    allReferralTx.slice(0, 10).forEach(tx => {
      console.log(`[${tx.currency}] ${tx.amount_uni || tx.amount_ton} - ${tx.description}`);
    });
  }
  
  // 3. Проверяем активность рефералов
  const { data: referrals, error: refError } = await supabase
    .from('users')
    .select('id, username, telegram_id, uni_deposit_amount, ton_farming_balance')
    .eq('referrer_id', 184)
    .gt('uni_deposit_amount', 0)
    .order('uni_deposit_amount', { ascending: false });
    
  console.log('\n\n👥 Рефералы с UNI депозитами:');
  if (referrals && referrals.length > 0) {
    console.log(`Количество: ${referrals.length}`);
    referrals.forEach(ref => {
      console.log(`- User ${ref.id}: ${ref.uni_deposit_amount} UNI депозит`);
    });
  } else {
    console.log('Нет рефералов с UNI депозитами');
  }
  
  // 4. Проверяем последние FARMING_REWARD транзакции рефералов
  if (referrals && referrals.length > 0) {
    const referralIds = referrals.map(r => r.id);
    
    const { data: farmingRewards, error: farmError } = await supabase
      .from('transactions')
      .select('user_id, amount_uni, created_at')
      .in('user_id', referralIds)
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'UNI')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(10);
      
    console.log('\n\n📈 Последние UNI FARMING_REWARD транзакции рефералов:');
    if (farmingRewards && farmingRewards.length > 0) {
      farmingRewards.forEach(tx => {
        console.log(`User ${tx.user_id}: ${tx.amount_uni} UNI в ${tx.created_at}`);
      });
      console.log('\n🔴 ВНИМАНИЕ: Рефералы получают доход, но реферальные комиссии НЕ начисляются!');
    }
  }
}

// Запускаем проверку
checkUniReferralRewards()
  .then(() => console.log('\n✅ Проверка завершена'))
  .catch(error => console.error('❌ Ошибка:', error));