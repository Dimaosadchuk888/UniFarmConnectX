#!/usr/bin/env tsx
/**
 * 🔍 АНАЛИЗ API ЛОГОВ: Поиск следов TON депозитов пользователей 255/256
 * Проверяем обращения к API endpoints за последние часы
 */

import { supabase } from './core/supabase';

async function analyzeTonDepositApiLogs() {
  console.log('🔍 АНАЛИЗ API ЛОГОВ: Поиск следов TON депозитов пользователей 255/256');
  console.log('='.repeat(80));

  try {
    // 1. Проверяем были ли вызовы к API ton-deposit за последние 4 часа
    console.log('\n1️⃣ ПОИСК ВЫЗОВОВ API /ton-deposit:');
    
    // Если есть таблица api_logs или подобная, проверим её
    // Иначе будем искать по транзакциям с метаданными
    
    const fourHoursAgo = new Date();
    fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);
    
    // Поиск всех TON_DEPOSIT за последние 4 часа с детальными метаданными
    const { data: recentDeposits, error: depositsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .gte('created_at', fourHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (depositsError) {
      console.log('❌ Ошибка получения депозитов:', depositsError.message);
    } else {
      console.log(`✅ Найдено TON депозитов за последние 4 часа: ${recentDeposits?.length || 0}`);
      
      recentDeposits?.forEach((dep, i) => {
        console.log(`\n💰 Депозит ${i + 1}:`);
        console.log(`   ID: ${dep.id}, user_id: ${dep.user_id}`);
        console.log(`   amount: ${dep.amount} ${dep.currency}`);
        console.log(`   status: ${dep.status}`);
        console.log(`   created_at: ${dep.created_at}`);
        console.log(`   tx_hash: ${dep.tx_hash || 'НЕТ ХЕША'}`);
        console.log(`   description: ${dep.description?.substring(0, 200)}...`);
        
        if (dep.metadata) {
          console.log(`   metadata:`, dep.metadata);
        }
      });
    }

    // 2. Проверяем неудавшиеся запросы - ищем записи со статусом failed/error
    console.log('\n2️⃣ ПОИСК НЕУДАВШИХСЯ TON ДЕПОЗИТОВ:');
    const { data: failedDeposits, error: failedError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .in('status', ['failed', 'error', 'rejected'])
      .gte('created_at', fourHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!failedError && failedDeposits) {
      console.log(`✅ Найдено неудавшихся депозитов: ${failedDeposits.length}`);
      failedDeposits.forEach((dep, i) => {
        console.log(`\n❌ Неудавшийся депозит ${i + 1}:`);
        console.log(`   user_id: ${dep.user_id}, amount: ${dep.amount}`);
        console.log(`   status: ${dep.status}`);
        console.log(`   description: ${dep.description}`);
        console.log(`   metadata:`, dep.metadata);
      });
    }

    // 3. Ищем pending депозиты которые могли зависнуть
    console.log('\n3️⃣ ПОИСК ЗАВИСШИХ PENDING ДЕПОЗИТОВ:');
    const { data: pendingDeposits, error: pendingError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .eq('status', 'pending')
      .gte('created_at', fourHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!pendingError && pendingDeposits) {
      console.log(`✅ Найдено pending депозитов: ${pendingDeposits.length}`);
      pendingDeposits.forEach((dep, i) => {
        console.log(`\n⏳ Pending депозит ${i + 1}:`);
        console.log(`   user_id: ${dep.user_id}, amount: ${dep.amount}`);
        console.log(`   created_at: ${dep.created_at}`);
        console.log(`   tx_hash: ${dep.tx_hash || 'НЕТ ХЕША'}`);
        console.log(`   description: ${dep.description}`);
        
        // Проверяем как долго он висит
        const createdTime = new Date(dep.created_at);
        const now = new Date();
        const minutesAgo = Math.floor((now.getTime() - createdTime.getTime()) / (1000 * 60));
        console.log(`   ⏰ Висит уже: ${minutesAgo} минут`);
      });
    }

    // 4. Поиск любых транзакций связанных с пользователями 255 или 256
    console.log('\n4️⃣ ПОИСК ВСЕХ ТРАНЗАКЦИЙ ПОЛЬЗОВАТЕЛЕЙ 255/256 ЗА 4 ЧАСА:');
    const { data: userTransactions, error: userTxError } = await supabase
      .from('transactions')
      .select('*')
      .in('user_id', [255, 256])
      .gte('created_at', fourHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!userTxError && userTransactions) {
      console.log(`✅ Найдено транзакций пользователей 255/256: ${userTransactions.length}`);
      userTransactions.forEach((tx, i) => {
        console.log(`\n🎯 Транзакция ${i + 1}:`);
        console.log(`   user_id: ${tx.user_id}, type: ${tx.type}`);
        console.log(`   amount: ${tx.amount} ${tx.currency}`);
        console.log(`   status: ${tx.status}`);
        console.log(`   created_at: ${tx.created_at}`);
        console.log(`   description: ${tx.description}`);
      });
    }

    // 5. Финальная проверка - ищем транзакции с telegram_id в описании
    console.log('\n5️⃣ ПОИСК ПО TELEGRAM_ID В ОПИСАНИИ:');
    const searchTerms = ['2064066630', '255']; // telegram_id пользователей
    
    for (const term of searchTerms) {
      const { data: telegramTx, error: telegramError } = await supabase
        .from('transactions')
        .select('*')
        .ilike('description', `%${term}%`)
        .gte('created_at', fourHoursAgo.toISOString())
        .limit(5);

      if (!telegramError && telegramTx && telegramTx.length > 0) {
        console.log(`\n🔍 Найдено транзакций с "${term}": ${telegramTx.length}`);
        telegramTx.forEach((tx, i) => {
          console.log(`   ${i + 1}. user_id: ${tx.user_id}, type: ${tx.type}, amount: ${tx.amount}`);
          console.log(`      description: ${tx.description.substring(0, 150)}...`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎯 ВЫВОДЫ АНАЛИЗА API ЛОГОВ:');
    console.log('1. Проверили все TON депозиты за последние 4 часа');
    console.log('2. Искали неудавшиеся и зависшие депозиты');
    console.log('3. Проанализировали активность пользователей 255/256');
    console.log('4. Проверили поиск по telegram_id в описаниях');
    console.log('\n💡 СЛЕДУЮЩИЙ ШАГ: Проверить TON blockchain API напрямую');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА АНАЛИЗА ЛОГОВ:', error);
  }
}

analyzeTonDepositApiLogs().catch(console.error);