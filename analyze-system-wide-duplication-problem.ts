/**
 * АНАЛИЗ СИСТЕМНОЙ ПРОБЛЕМЫ ДУБЛИРОВАНИЯ ПОЛЬЗОВАТЕЛЕЙ
 * Находим все дубликаты и анализируем масштаб проблемы
 */

import { supabase } from './core/supabase.js';

async function analyzeSystemWideDuplication() {
  console.log('🔍 АНАЛИЗ СИСТЕМНОЙ ПРОБЛЕМЫ ДУБЛИРОВАНИЯ');
  console.log('⏰ Время анализа:', new Date().toISOString());
  
  try {
    // 1. Находим все профили пользователей
    console.log('\n=== 1. ПОИСК ВСЕХ ПОЛЬЗОВАТЕЛЕЙ ===');
    
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_uni, balance_ton, created_at')
      .order('id', { ascending: true });
    
    console.log(`👥 Всего пользователей в системе: ${allUsers?.length || 0}`);
    
    if (!allUsers || allUsers.length === 0) {
      console.log('❌ Пользователи не найдены!');
      return;
    }
    
    // 2. Анализируем дубликаты
    console.log('\n=== 2. АНАЛИЗ ДУБЛИРОВАНИЯ ===');
    
    const withTelegramId = allUsers.filter(u => u.telegram_id && u.telegram_id > 0);
    const withoutTelegramId = allUsers.filter(u => !u.telegram_id || u.telegram_id === 0);
    
    console.log(`✅ Пользователи с telegram_id: ${withTelegramId.length}`);
    console.log(`❌ Пользователи без telegram_id: ${withoutTelegramId.length}`);
    
    // 3. Ищем пересечения по internal_id
    console.log('\n=== 3. ПОИСК ДУБЛИКАТОВ ===');
    
    const duplicatePairs = [];
    const processedTelegramIds = new Set();
    
    withTelegramId.forEach(userWithTelegram => {
      if (processedTelegramIds.has(userWithTelegram.telegram_id)) return;
      
      // Ищем пользователя с internal_id = telegram_id этого пользователя
      const possibleDuplicate = withoutTelegramId.find(u => u.id === userWithTelegram.telegram_id);
      
      if (possibleDuplicate) {
        duplicatePairs.push({
          main: userWithTelegram,
          duplicate: possibleDuplicate
        });
        processedTelegramIds.add(userWithTelegram.telegram_id);
      }
    });
    
    console.log(`🔍 Найдено пар дубликатов: ${duplicatePairs.length}`);
    
    if (duplicatePairs.length > 0) {
      console.log('\n📋 ДЕТАЛИ ДУБЛИКАТОВ:');
      
      duplicatePairs.forEach((pair, i) => {
        console.log(`\n  Пара ${i+1}:`);
        console.log(`    ОСНОВНОЙ: internal_id=${pair.main.id}, telegram_id=${pair.main.telegram_id}, username=${pair.main.username}`);
        console.log(`              UNI=${pair.main.balance_uni}, TON=${pair.main.balance_ton}`);
        console.log(`    ДУБЛИКАТ: internal_id=${pair.duplicate.id}, telegram_id=${pair.duplicate.telegram_id || 'NULL'}, username=${pair.duplicate.username}`);
        console.log(`              UNI=${pair.duplicate.balance_uni}, TON=${pair.duplicate.balance_ton}`);
      });
    }
    
    // 4. Анализируем транзакции дубликатов
    console.log('\n=== 4. АНАЛИЗ ТРАНЗАКЦИЙ ДУБЛИКАТОВ ===');
    
    let totalDuplicateTransactions = 0;
    let totalLostUni = 0;
    let totalLostTon = 0;
    
    for (const pair of duplicatePairs) {
      // Транзакции дубликата
      const { data: duplicateTransactions } = await supabase
        .from('transactions')
        .select('type, amount_uni, amount_ton, currency, status')
        .eq('user_id', pair.duplicate.id)
        .eq('status', 'completed');
      
      if (duplicateTransactions && duplicateTransactions.length > 0) {
        totalDuplicateTransactions += duplicateTransactions.length;
        
        let pairUni = 0;
        let pairTon = 0;
        
        duplicateTransactions.forEach(tx => {
          const amountUni = parseFloat(tx.amount_uni) || 0;
          const amountTon = parseFloat(tx.amount_ton) || 0;
          
          if (tx.type !== 'WITHDRAWAL') {
            pairUni += amountUni;
            pairTon += amountTon;
          }
        });
        
        totalLostUni += pairUni;
        totalLostTon += pairTon;
        
        console.log(`  Пользователь ${pair.main.telegram_id}: ${duplicateTransactions.length} транзакций у дубликата`);
        console.log(`    Потерянные средства: ${pairUni.toFixed(6)} UNI, ${pairTon.toFixed(6)} TON`);
      }
    }
    
    console.log(`\n📊 ИТОГОВАЯ СТАТИСТИКА:`);
    console.log(`   Всего пользователей: ${allUsers.length}`);
    console.log(`   С telegram_id: ${withTelegramId.length}`);
    console.log(`   Без telegram_id: ${withoutTelegramId.length}`);
    console.log(`   Пар дубликатов: ${duplicatePairs.length}`);
    console.log(`   Транзакций у дубликатов: ${totalDuplicateTransactions}`);
    console.log(`   ПОТЕРЯННЫЕ СРЕДСТВА:`);
    console.log(`     UNI: ${totalLostUni.toFixed(6)}`);
    console.log(`     TON: ${totalLostTon.toFixed(6)}`);
    
    // 5. План исправления
    console.log('\n=== 5. ПЛАН ИСПРАВЛЕНИЯ ===');
    
    if (duplicatePairs.length > 0) {
      console.log('🔧 НЕОБХОДИМЫЕ ДЕЙСТВИЯ:');
      console.log('   1. Перенести все транзакции с дубликатов на основные профили');
      console.log('   2. Пересчитать балансы основных профилей');
      console.log('   3. Удалить дубликаты после переноса');
      console.log('   4. Обновить BalanceManager для обработки переходного периода');
      
      console.log('\n📝 ДЕТАЛЬНЫЙ ПЛАН:');
      duplicatePairs.forEach((pair, i) => {
        console.log(`   Пользователь ${pair.main.telegram_id}:`);
        console.log(`     - Перенести транзакции с user_id=${pair.duplicate.id} на user_id=${pair.main.telegram_id}`);
        console.log(`     - Пересчитать баланс`);
        console.log(`     - Удалить профиль internal_id=${pair.duplicate.id}`);
      });
      
      return {
        duplicatePairs,
        totalDuplicateTransactions,
        totalLostUni,
        totalLostTon,
        needsFix: true
      };
    } else {
      console.log('✅ Системных дубликатов не найдено');
      return {
        duplicatePairs: [],
        totalDuplicateTransactions: 0,
        totalLostUni: 0,
        totalLostTon: 0,
        needsFix: false
      };
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка анализа:', error);
    console.error('Stack:', error.stack);
    return null;
  }
}

analyzeSystemWideDuplication();