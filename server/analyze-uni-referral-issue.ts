/**
 * Детальный анализ проблемы с UNI реферальными транзакциями
 * БЕЗ ИЗМЕНЕНИЯ КОДА - только анализ
 */

import { supabase } from '../core/supabase';

async function analyzeUniReferralIssue() {
  console.log('\n=== ДЕТАЛЬНЫЙ АНАЛИЗ ПРОБЛЕМЫ С UNI РЕФЕРАЛЬНЫМИ ===\n');
  
  // 1. Проверяем последние реферальные транзакции с полной структурой
  console.log('1️⃣ ПРОВЕРКА СТРУКТУРЫ UNI РЕФЕРАЛЬНЫХ ТРАНЗАКЦИЙ:');
  
  const { data: referralTx, error: refError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .eq('type', 'REFERRAL_REWARD')
    .eq('currency', 'UNI')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (refError) {
    console.error('Ошибка:', refError);
    return;
  }
  
  console.log(`\nНайдено UNI реферальных транзакций: ${referralTx?.length || 0}`);
  
  if (referralTx && referralTx.length > 0) {
    referralTx.forEach((tx, i) => {
      console.log(`\n${i + 1}. Транзакция ID ${tx.id}:`);
      console.log(`   - type: ${tx.type}`);
      console.log(`   - currency: ${tx.currency}`);
      console.log(`   - amount: ${tx.amount}`);
      console.log(`   - amount_uni: ${tx.amount_uni}`);
      console.log(`   - amount_ton: ${tx.amount_ton}`);
      console.log(`   - status: ${tx.status}`);
      console.log(`   - description: ${tx.description}`);
      console.log(`   - created_at: ${tx.created_at}`);
    });
  } else {
    console.log('❌ UNI реферальные транзакции НЕ НАЙДЕНЫ!');
  }
  
  // 2. Проверяем как транзакции распределены по страницам
  console.log('\n\n2️⃣ АНАЛИЗ ПАГИНАЦИИ:');
  
  // Получаем все транзакции пользователя
  const { data: allTx, count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', 184)
    .order('created_at', { ascending: false });
    
  console.log(`\nВсего транзакций пользователя 184: ${count}`);
  
  // Группируем по типам
  const byType: Record<string, number> = {};
  allTx?.forEach(tx => {
    const key = `${tx.type}_${tx.currency}`;
    byType[key] = (byType[key] || 0) + 1;
  });
  
  console.log('\nРаспределение по типам:');
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, cnt]) => {
    console.log(`- ${type}: ${cnt} транзакций`);
  });
  
  // 3. Проверяем позицию UNI реферальных в общем списке
  console.log('\n\n3️⃣ ПОЗИЦИЯ UNI РЕФЕРАЛЬНЫХ В ОБЩЕМ СПИСКЕ:');
  
  if (allTx) {
    let foundPositions: number[] = [];
    allTx.forEach((tx, index) => {
      if (tx.type === 'REFERRAL_REWARD' && tx.currency === 'UNI') {
        foundPositions.push(index + 1);
      }
    });
    
    if (foundPositions.length > 0) {
      console.log(`\nUNI реферальные найдены на позициях: ${foundPositions.join(', ')}`);
      console.log(`Это означает, что они будут на страницах:`);
      foundPositions.forEach(pos => {
        const page = Math.ceil(pos / 20);
        console.log(`- Позиция ${pos} → Страница ${page}`);
      });
    } else {
      console.log('❌ UNI реферальные НЕ найдены в общем списке транзакций!');
    }
  }
  
  // 4. Проверяем логику фильтрации
  console.log('\n\n4️⃣ ПРОВЕРКА ФИЛЬТРАЦИИ ПО ВАЛЮТЕ:');
  
  // Симулируем фильтр currency='UNI'
  const { data: uniOnly, error: uniError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .eq('currency', 'UNI')
    .order('created_at', { ascending: false })
    .limit(20);
    
  if (uniOnly) {
    const types = new Set(uniOnly.map(tx => tx.type));
    console.log(`\nПри фильтре currency='UNI' найдено типов: ${Array.from(types).join(', ')}`);
    
    const hasReferral = uniOnly.some(tx => tx.type === 'REFERRAL_REWARD');
    console.log(`Есть ли REFERRAL_REWARD на первой странице: ${hasReferral ? '✅ ДА' : '❌ НЕТ'}`);
  }
  
  // 5. Проверяем реферальную цепочку
  console.log('\n\n5️⃣ ПРОВЕРКА РЕФЕРАЛЬНОЙ ЦЕПОЧКИ:');
  
  const { data: referrals } = await supabase
    .from('users')
    .select('id, username, uni_deposit_amount, referrer_id')
    .eq('referrer_id', 184);
    
  console.log(`\nРефералы пользователя 184: ${referrals?.length || 0}`);
  if (referrals && referrals.length > 0) {
    referrals.forEach(ref => {
      console.log(`- User ${ref.id}: депозит ${ref.uni_deposit_amount} UNI`);
    });
  }
  
  // 6. Анализ кода создания реферальных транзакций
  console.log('\n\n6️⃣ АНАЛИЗ СОЗДАНИЯ РЕФЕРАЛЬНЫХ ТРАНЗАКЦИЙ:');
  console.log('\nМеста в коде где создаются UNI реферальные:');
  console.log('1. core/scheduler/farmingScheduler.ts:275-283 - вызов distributeReferralRewards');
  console.log('2. modules/referral/service.ts - метод distributeReferralRewards');
  console.log('   - Строки где создается транзакция через UnifiedTransactionService');
  console.log('   - Параметры: type: "REFERRAL_REWARD", currency: "UNI"');
  
  // 7. Финальный вывод
  console.log('\n\n📊 ИТОГОВЫЙ АНАЛИЗ:');
  console.log('====================');
  
  if (referralTx && referralTx.length > 0) {
    console.log('✅ UNI реферальные транзакции СОЗДАЮТСЯ в БД');
    console.log('⚠️  Но могут быть НЕ ВИДНЫ в UI из-за:');
    console.log('   1. Пагинации - они на 2-3 странице');
    console.log('   2. Большого количества FARMING_REWARD транзакций');
    console.log('   3. Возможной задержки в обновлении UI');
  } else {
    console.log('❌ UNI реферальные транзакции НЕ СОЗДАЮТСЯ');
    console.log('   Возможные причины:');
    console.log('   1. Ошибка в ReferralService.distributeReferralRewards');
    console.log('   2. Неправильные параметры при создании транзакции');
    console.log('   3. Проблема с определением currency при создании');
  }
}

// Запускаем анализ
analyzeUniReferralIssue()
  .then(() => console.log('\n✅ Анализ завершен'))
  .catch(error => console.error('❌ Ошибка:', error));