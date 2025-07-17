/**
 * Проверка отображения UNI реферальных транзакций
 */

import { supabase } from '../core/supabase';

async function checkUniReferralDisplay() {
  console.log('\n=== ПРОВЕРКА ОТОБРАЖЕНИЯ UNI РЕФЕРАЛЬНЫХ ===\n');
  
  // 1. Проверяем ВСЕ транзакции пользователя 184 за последние 24 часа
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: allTransactions, error: allError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false });
    
  if (allError) {
    console.error('Ошибка:', allError);
    return;
  }
  
  console.log(`📊 Всего транзакций за 24 часа: ${allTransactions?.length || 0}`);
  
  // Группируем по типам и валютам
  const stats: Record<string, Record<string, { count: number; total: number }>> = {};
  
  allTransactions?.forEach(tx => {
    const type = tx.type || 'UNKNOWN';
    const currency = tx.currency || 'UNKNOWN';
    
    if (!stats[type]) stats[type] = {};
    if (!stats[type][currency]) stats[type][currency] = { count: 0, total: 0 };
    
    stats[type][currency].count++;
    stats[type][currency].total += parseFloat(tx.amount_uni || tx.amount_ton || '0');
  });
  
  console.log('\n📈 Статистика по типам транзакций:');
  Object.entries(stats).forEach(([type, currencies]) => {
    console.log(`\n${type}:`);
    Object.entries(currencies).forEach(([currency, data]) => {
      console.log(`  ${currency}: ${data.count} транзакций, сумма: ${data.total.toFixed(6)}`);
    });
  });
  
  // 2. Детально смотрим REFERRAL_REWARD
  const referralStats = stats['REFERRAL_REWARD'];
  if (referralStats) {
    console.log('\n🎯 ДЕТАЛИ РЕФЕРАЛЬНЫХ НАЧИСЛЕНИЙ:');
    console.log(`UNI реферальных: ${referralStats['UNI']?.count || 0} транзакций`);
    console.log(`TON реферальных: ${referralStats['TON']?.count || 0} транзакций`);
  }
  
  // 3. Проверяем самые свежие транзакции
  console.log('\n📜 Последние 20 транзакций:');
  allTransactions?.slice(0, 20).forEach(tx => {
    const amount = tx.currency === 'UNI' ? tx.amount_uni : tx.amount_ton;
    console.log(`[${tx.type}] ${amount} ${tx.currency} - ${tx.description?.substring(0, 50)}...`);
  });
  
  // 4. Проверяем API endpoint /api/v2/transactions
  console.log('\n\n🔍 ПРОВЕРКА: Почему транзакции могут не отображаться в UI?');
  console.log('1. Фильтрация по валюте - проверьте вкладки UNI/TON/Все');
  console.log('2. Пагинация - реферальные могут быть на других страницах');
  console.log('3. Сортировка - новые транзакции сверху');
  
  // 5. Проверяем активность рефералов детально
  const { data: referrals, error: refError } = await supabase
    .from('users')
    .select('*')
    .eq('referrer_id', 184)
    .order('created_at', { ascending: false });
    
  console.log(`\n\n👥 Всего рефералов: ${referrals?.length || 0}`);
  
  if (referrals && referrals.length > 0) {
    console.log('\nРефералы с депозитами:');
    let activeCount = 0;
    referrals.forEach(ref => {
      if (ref.uni_deposit_amount > 0 || ref.ton_farming_balance > 0) {
        activeCount++;
        console.log(`- User ${ref.id}: UNI депозит ${ref.uni_deposit_amount}, TON депозит ${ref.ton_farming_balance}`);
      }
    });
    console.log(`\nАктивных рефералов: ${activeCount} из ${referrals.length}`);
  }
}

// Запускаем проверку
checkUniReferralDisplay()
  .then(() => console.log('\n✅ Проверка завершена'))
  .catch(error => console.error('❌ Ошибка:', error));