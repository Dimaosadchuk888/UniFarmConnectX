#!/usr/bin/env tsx
/**
 * 🔍 ГЛУБОКОЕ РАССЛЕДОВАНИЕ: Потерянные 1.65 TON пользователя ID 255
 * Ищем транзакции которые прошли blockchain но не попали в систему
 */

import { supabase } from './core/supabase';

async function deepInvestigateUser255() {
  console.log('🔍 ГЛУБОКОЕ РАССЛЕДОВАНИЕ: Потерянные 1.65 TON пользователя ID 255');
  console.log('='.repeat(80));

  try {
    // 1. Ищем ВСЕ записи пользователя 255 с тоном
    console.log('\n1️⃣ ПОЛНЫЙ ПОИСК ПОЛЬЗОВАТЕЛЯ 255:');
    
    // Поиск по разным вариантам ID
    const searches = [
      { field: 'id', value: 255 },
      { field: 'telegram_id', value: 2064066630 },
      { field: 'username', value: 'Glazeb0' }
    ];

    for (const search of searches) {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq(search.field, search.value);

      if (!error && users && users.length > 0) {
        console.log(`✅ Найден по ${search.field}:`, users[0]);
      }
    }

    // 2. Ищем ЛЮБЫЕ транзакции с описанием содержащим данные пользователя
    console.log('\n2️⃣ ПОИСК ТРАНЗАКЦИЙ ПО ОПИСАНИЮ:');
    
    const searchTerms = ['255', '2064066630', 'Glazeb0', 'rjvfy'];
    
    for (const term of searchTerms) {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .ilike('description', `%${term}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && transactions && transactions.length > 0) {
        console.log(`\n🔍 Найдено транзакций с "${term}": ${transactions.length}`);
        transactions.forEach((tx, i) => {
          console.log(`  ${i + 1}. ID ${tx.id}: ${tx.amount} ${tx.currency}, user_id: ${tx.user_id}`);
          console.log(`     type: ${tx.type}, status: ${tx.status}`);
          console.log(`     description: ${tx.description}`);
          console.log(`     created_at: ${tx.created_at}`);
        });
      }
    }

    // 3. Поиск по tx_hash - ищем хеши транзакций с суммами 0.65 и 1.0
    console.log('\n3️⃣ ПОИСК ПО TX_HASH ПОСЛЕДНИХ ДЕПОЗИТОВ:');
    
    const { data: recentWithHash, error: hashError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .not('tx_hash', 'is', null)
      .gte('created_at', '2025-08-04T08:00:00.000Z')
      .order('created_at', { ascending: false });

    if (!hashError && recentWithHash) {
      console.log(`✅ Найдено депозитов с хешами: ${recentWithHash.length}`);
      recentWithHash.forEach((tx, i) => {
        console.log(`\n🔗 Депозит ${i + 1}:`);
        console.log(`   user_id: ${tx.user_id}, amount: ${tx.amount} ${tx.currency}`);
        console.log(`   tx_hash: ${tx.tx_hash}`);
        console.log(`   created_at: ${tx.created_at}`);
        console.log(`   description: ${tx.description}`);
      });
    }

    // 4. Поиск потерянных депозитов - любые TON_DEPOSIT без user_id или с ошибками
    console.log('\n4️⃣ ПОИСК ПОТЕРЯННЫХ/ОШИБОЧНЫХ ДЕПОЗИТОВ:');
    
    const { data: orphanDeposits, error: orphanError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .gte('created_at', '2025-08-04T08:00:00.000Z')
      .order('created_at', { ascending: false });

    if (!orphanError && orphanDeposits) {
      console.log(`✅ Всего TON депозитов за сегодня: ${orphanDeposits.length}`);
      
      // Ищем депозиты с суммами 0.65 или 1.0
      const targetAmounts = orphanDeposits.filter(tx => 
        ['0.65', '1.0', '1', '0.650000', '1.000000', '0.65000000', '1.00000000'].includes(tx.amount)
      );
      
      console.log(`🎯 Депозиты с суммами 0.65/1.0: ${targetAmounts.length}`);
      targetAmounts.forEach((tx, i) => {
        console.log(`\n💰 Целевой депозит ${i + 1}:`);
        console.log(`   ID: ${tx.id}, user_id: ${tx.user_id}`);
        console.log(`   amount: ${tx.amount} ${tx.currency}`);
        console.log(`   status: ${tx.status}`);
        console.log(`   tx_hash: ${tx.tx_hash || 'НЕТ ХЕША'}`);
        console.log(`   created_at: ${tx.created_at}`);
        console.log(`   description: ${tx.description}`);
      });
    }

    // 5. Проверим системные логи - поиск в описаниях депозитов blockchain данных
    console.log('\n5️⃣ АНАЛИЗ BLOCKCHAIN ДАННЫХ В ДЕПОЗИТАХ:');
    
    const { data: blockchainDeposits, error: bcError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .ilike('description', '%blockchain%')
      .gte('created_at', '2025-08-04T08:00:00.000Z')
      .order('created_at', { ascending: false});

    if (!bcError && blockchainDeposits) {
      console.log(`✅ Депозитов с blockchain данными: ${blockchainDeposits.length}`);
      blockchainDeposits.forEach((tx, i) => {
        console.log(`\n🔗 Blockchain депозит ${i + 1}:`);
        console.log(`   user_id: ${tx.user_id}, amount: ${tx.amount}`);
        console.log(`   description: ${tx.description.substring(0, 200)}...`);
        console.log(`   created_at: ${tx.created_at}`);
        
        // Извлекаем данные из description
        if (tx.description.includes('te6cck')) {
          const boc = tx.description.match(/te6cck[A-Za-z0-9+/=]+/)?.[0];
          if (boc) {
            console.log(`   🔑 BOC данные: ${boc.substring(0, 50)}...`);
          }
        }
      });
    }

    // 6. Финальная проверка - есть ли depозиты без привязки к пользователю
    console.log('\n6️⃣ ПОИСК ДЕПОЗИТОВ БЕЗ ПОЛЬЗОВАТЕЛЯ:');
    
    const { data: noUserDeposits, error: noUserError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .is('user_id', null)
      .gte('created_at', '2025-08-04T08:00:00.000Z');

    if (!noUserError) {
      console.log(`✅ Депозитов без user_id: ${noUserDeposits?.length || 0}`);
      noUserDeposits?.forEach((tx, i) => {
        console.log(`\n👻 Orphan депозит ${i + 1}:`);
        console.log(`   amount: ${tx.amount} ${tx.currency}`);
        console.log(`   tx_hash: ${tx.tx_hash || 'НЕТ ХЕША'}`);
        console.log(`   description: ${tx.description}`);
        console.log(`   created_at: ${tx.created_at}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎯 ЗАКЛЮЧЕНИЕ ГЛУБОКОГО РАССЛЕДОВАНИЯ:');
    console.log('1. Проверили все возможные варианты поиска пользователя 255');
    console.log('2. Искали транзакции по описанию, хешам, суммам');
    console.log('3. Проанализировали blockchain данные в депозитах');
    console.log('4. Проверили orphan депозиты без привязки к пользователю');
    console.log('\n💡 СЛЕДУЮЩИЙ ШАГ: Проверить webhook логи и TON API');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА РАССЛЕДОВАНИЯ:', error);
  }
}

deepInvestigateUser255().catch(console.error);