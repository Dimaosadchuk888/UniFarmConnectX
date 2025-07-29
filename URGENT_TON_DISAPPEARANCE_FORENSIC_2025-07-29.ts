#!/usr/bin/env tsx

/**
 * 🔍 СРОЧНАЯ ЭКСПЕРТИЗА: ИСЧЕЗНОВЕНИЕ TON ДЕПОЗИТА
 * 
 * Задача: Найти что именно вызвало исчезновение TON депозита с hash:
 * te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKAZFqBrbNaPH4b9vZKiI0oNeqCv7vSXsjA4bEKLPoG790eC7HcB67S2L8lOebWgglPYqaFvClm7PfZoWdKKPUUAFNTRi7REcE+AAAGcAAHAEAaEIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKlloLwAAAAAAAAAAAAAAAAAAB9T+7Q
 * 
 * User ID: 25, время: около 14:49 29.07.2025
 */

import { supabase } from './server/supabaseClient.js';

const TARGET_TX_HASH = 'te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKAZFqBrbNaPH4b9vZKiI0oNeqCv7vSXsjA4bEKLPoG790eC7HcB67S2L8lOebWgglPYqaFvClm7PfZoWdKKPUUAFNTRi7REcE+AAAGcAAHAEAaEIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKlloLwAAAAAAAAAAAAAAAAAAB9T+7Q';
const TARGET_USER_ID = 25;
const INCIDENT_TIME = '2025-07-29 14:40:00'; // Примерное время инцидента

async function forensicAnalysis() {
  console.log('🔍 НАЧАЛО СРОЧНОЙ ЭКСПЕРТИЗЫ ПО ИСЧЕЗНОВЕНИЮ TON');
  console.log('=' .repeat(80));
  console.log(`Target TX Hash: ${TARGET_TX_HASH.substring(0, 50)}...`);
  console.log(`Target User ID: ${TARGET_USER_ID}`);
  console.log(`Incident Time: ${INCIDENT_TIME}`);
  console.log('=' .repeat(80));

  // 1. ПОИСК ТРАНЗАКЦИИ ПО HASH В БАЗЕ ДАННЫХ
  console.log('\n🔍 ЭТАП 1: ПОИСК ТРАНЗАКЦИИ В БД');
  console.log('-'.repeat(50));
  
  try {
    // Поиск по всем возможным полям с hash
    const searchQueries = [
      { table: 'transactions', field: 'metadata', desc: 'metadata содержит tx_hash' },
      { table: 'transactions', field: 'tx_hash', desc: 'прямое поле tx_hash' },
      { table: 'wallet_balances', field: 'metadata', desc: 'wallet_balances metadata' },
      { table: 'ton_deposits', field: 'tx_hash', desc: 'ton_deposits таблица' },
      { table: 'boost_purchases', field: 'tx_hash', desc: 'boost_purchases таблица' }
    ];

    let foundTransaction: any = null;

    for (const query of searchQueries) {
      console.log(`\n  Поиск в ${query.table}.${query.field} (${query.desc})...`);
      
      let searchResult;
      if (query.field === 'metadata') {
        // Поиск внутри JSON поля metadata
        searchResult = await supabase
          .from(query.table)
          .select('*')
          .like('metadata', `%${TARGET_TX_HASH}%`);
      } else {
        // Прямой поиск по полю
        searchResult = await supabase
          .from(query.table)
          .select('*')
          .eq(query.field, TARGET_TX_HASH);
      }

      if (searchResult.error) {
        console.log(`    ❌ Ошибка поиска в ${query.table}: ${searchResult.error.message}`);
        continue;
      }

      if (searchResult.data && searchResult.data.length > 0) {
        console.log(`    ✅ НАЙДЕНО ${searchResult.data.length} записей в ${query.table}`);
        foundTransaction = { table: query.table, data: searchResult.data[0] };
        console.log(`    📄 Данные:`, JSON.stringify(searchResult.data[0], null, 2));
        break;
      } else {
        console.log(`    ❌ Не найдено в ${query.table}.${query.field}`);
      }
    }

    // 2. ПОИСК ПО СОКРАЩЕННОМУ HASH (последние символы)
    console.log('\n🔍 ЭТАП 2: ПОИСК ПО СОКРАЩЕННОМУ HASH');
    console.log('-'.repeat(50));
    
    const shortHash = TARGET_TX_HASH.substring(TARGET_TX_HASH.length - 20); // Последние 20 символов
    console.log(`Поиск по окончанию: ...${shortHash}`);

    const { data: metadataSearch, error: metaError } = await supabase
      .from('transactions')
      .select('*')
      .like('metadata', `%${shortHash}%`)
      .eq('user_id', TARGET_USER_ID);

    if (metaError) {
      console.log(`❌ Ошибка поиска metadata: ${metaError.message}`);
    } else if (metadataSearch && metadataSearch.length > 0) {
      console.log(`✅ НАЙДЕНО по сокращенному hash: ${metadataSearch.length} записей`);
      metadataSearch.forEach((tx, index) => {
        console.log(`  Транзакция ${index + 1}:`, JSON.stringify(tx, null, 2));
      });
      foundTransaction = { table: 'transactions', data: metadataSearch[0] };
    } else {
      console.log(`❌ Не найдено по сокращенному hash`);
    }

    // 3. АНАЛИЗ ВСЕХ ТРАНЗАКЦИЙ USER 25 ОКОЛО ВРЕМЕНИ ИНЦИДЕНТА
    console.log('\n🔍 ЭТАП 3: АНАЛИЗ ВСЕХ ТРАНЗАКЦИЙ USER 25 В ПЕРИОД ИНЦИДЕНТА');
    console.log('-'.repeat(50));

    const { data: userTransactions, error: userError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', TARGET_USER_ID)
      .gte('created_at', '2025-07-29 14:40:00')
      .lte('created_at', '2025-07-29 15:00:00')
      .order('created_at', { ascending: true });

    if (userError) {
      console.log(`❌ Ошибка получения транзакций User 25: ${userError.message}`);
    } else {
      console.log(`📊 Найдено ${userTransactions?.length || 0} транзакций User 25 в период 14:40-15:00`);
      
      userTransactions?.forEach((tx, index) => {
        console.log(`\n  Транзакция ${index + 1}:`);
        console.log(`    ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount_ton} TON / ${tx.amount_uni} UNI`);
        console.log(`    Status: ${tx.status}, Created: ${tx.created_at}`);
        console.log(`    Description: ${tx.description}`);
        if (tx.metadata) {
          console.log(`    Metadata: ${JSON.stringify(tx.metadata, null, 2)}`);
        }
      });
    }

    // 4. ПОИСК СВЯЗАННЫХ ОПЕРАЦИЙ (УДАЛЕНИЯ, ROLLBACK)
    console.log('\n🔍 ЭТАП 4: ПОИСК СВЯЗАННЫХ ОПЕРАЦИЙ И ROLLBACK');
    console.log('-'.repeat(50));

    // Поиск операций удаления или отката
    const suspiciousTypes = ['ROLLBACK', 'REVERSAL', 'DELETION', 'CORRECTION'];
    
    for (const type of suspiciousTypes) {
      const { data: suspiciousOps, error: suspError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', TARGET_USER_ID)
        .like('type', `%${type}%`)
        .gte('created_at', '2025-07-29 14:40:00');

      if (suspError) {
        console.log(`❌ Ошибка поиска ${type}: ${suspError.message}`);
      } else if (suspiciousOps && suspiciousOps.length > 0) {
        console.log(`⚠️  НАЙДЕНЫ ${type} операции: ${suspiciousOps.length}`);
        suspiciousOps.forEach(op => {
          console.log(`    ${op.type}: ${op.amount_ton} TON, ${op.description}, ${op.created_at}`);
        });
      }
    }

    // 5. АНАЛИЗ БАЛАНСА USER 25 ДО И ПОСЛЕ
    console.log('\n🔍 ЭТАП 5: АНАЛИЗ ИЗМЕНЕНИЙ БАЛАНСА USER 25');
    console.log('-'.repeat(50));

    const { data: currentBalance, error: balanceError } = await supabase
      .from('users')
      .select('balance_ton, balance_uni, updated_at')
      .eq('id', TARGET_USER_ID)
      .single();

    if (balanceError) {
      console.log(`❌ Ошибка получения баланса: ${balanceError.message}`);
    } else {
      console.log(`💰 Текущий баланс User 25:`);
      console.log(`    TON: ${currentBalance.balance_ton}`);
      console.log(`    UNI: ${currentBalance.balance_uni}`);
      console.log(`    Updated: ${currentBalance.updated_at}`);
    }

    // 6. ПРОВЕРКА wallet_balances НА НАЛИЧИЕ ЗАПИСЕЙ
    console.log('\n🔍 ЭТАП 6: ПРОВЕРКА wallet_balances');
    console.log('-'.repeat(50));

    const { data: walletBalances, error: walletError } = await supabase
      .from('wallet_balances')
      .select('*')
      .eq('user_id', TARGET_USER_ID)
      .gte('created_at', '2025-07-29 14:40:00')
      .order('created_at', { ascending: true });

    if (walletError) {
      console.log(`❌ Ошибка wallet_balances: ${walletError.message}`);
    } else {
      console.log(`📊 Найдено ${walletBalances?.length || 0} записей в wallet_balances`);
      walletBalances?.forEach((wb, index) => {
        console.log(`  Запись ${index + 1}: TON: ${wb.balance_ton}, UNI: ${wb.balance_uni}, ${wb.created_at}`);
      });
    }

    // ФИНАЛЬНАЯ ДИАГНОСТИКА
    console.log('\n' + '='.repeat(80));
    console.log('🎯 ИТОГОВЫЙ ДИАГНОСТИЧЕСКИЙ ОТЧЕТ');
    console.log('='.repeat(80));

    if (foundTransaction) {
      console.log('✅ ТРАНЗАКЦИЯ НАЙДЕНА:');
      console.log(`   Таблица: ${foundTransaction.table}`);
      console.log(`   ID: ${foundTransaction.data.id}`);
      console.log(`   Type: ${foundTransaction.data.type}`);
      console.log(`   Amount: ${foundTransaction.data.amount_ton} TON`);
      console.log(`   Status: ${foundTransaction.data.status}`);
      console.log(`   Created: ${foundTransaction.data.created_at}`);
      
      // Поиск последующих операций с этой транзакцией
      console.log('\n🔍 ПОИСК ОПЕРАЦИЙ С НАЙДЕННОЙ ТРАНЗАКЦИЕЙ:');
      
      const { data: relatedOps, error: relatedError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', TARGET_USER_ID)
        .gte('created_at', foundTransaction.data.created_at)
        .order('created_at', { ascending: true });

      if (!relatedError && relatedOps) {
        console.log(`📊 Найдены ${relatedOps.length} операций после депозита:`);
        relatedOps.forEach((op, index) => {
          const timeDiff = new Date(op.created_at).getTime() - new Date(foundTransaction.data.created_at).getTime();
          console.log(`  ${index + 1}. ${op.type}: ${op.amount_ton} TON (через ${Math.round(timeDiff/1000)} сек)`);
        });
      }

      console.log('\n🚨 ПРЕДВАРИТЕЛЬНОЕ ЗАКЛЮЧЕНИЕ:');
      console.log('   - Транзакция была создана в БД');
      console.log('   - Необходимо проверить последующие операции');
      console.log('   - Возможно системный rollback или пересчет баланса');
      
    } else {
      console.log('❌ ТРАНЗАКЦИЯ НЕ НАЙДЕНА В БД:');
      console.log('   - Hash отсутствует во всех таблицах');
      console.log('   - Возможно депозит не был сохранен изначально');
      console.log('   - Проблема на этапе saveTransaction()');
      
      console.log('\n🚨 КРИТИЧЕСКОЕ ЗАКЛЮЧЕНИЕ:');
      console.log('   - Транзакция НЕ ПОПАЛА в базу данных');
      console.log('   - Frontend показал зачисление, но backend НЕ СОХРАНИЛ');
      console.log('   - Проблема в цепочке TON Connect → API → Database');
    }

  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА ЭКСПЕРТИЗЫ:', error);
    console.log('\n❌ ЭКСПЕРТИЗА ПРЕРВАНА - ТРЕБУЕТСЯ РУЧНАЯ ПРОВЕРКА');
  }

  console.log('\n' + '='.repeat(80));
  console.log('📋 РЕКОМЕНДАЦИИ ПО ДАЛЬНЕЙШИМ ДЕЙСТВИЯМ:');
  console.log('1. Проверить логи сервера на момент 14:40-15:00');
  console.log('2. Найти вызовы /api/v2/wallet/ton-deposit около 14:49');
  console.log('3. Проверить отработку UnifiedTransactionService.createTransaction');
  console.log('4. Поиск автоматических rollback процедур в коде');
  console.log('5. Анализ планировщиков и cron задач');
  console.log('='.repeat(80));
}

forensicAnalysis().catch(console.error);