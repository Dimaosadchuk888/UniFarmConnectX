#!/usr/bin/env node

/**
 * КРИТИЧНАЯ ДИАГНОСТИКА: ТРАССИНГ БАЛАНСА User #25
 * Выясняет где и когда произошло списание 2.99 TON
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function criticalBalanceTracing() {
  console.log('🚨 КРИТИЧНАЯ ДИАГНОСТИКА: ТРАССИНГ БАЛАНСА User #25');
  console.log('='.repeat(80));
  console.log(`📅 ${new Date().toLocaleString('ru-RU')}`);
  console.log('Цель: Найти где пропало 2.99 TON из 3.3 TON');
  
  // 1. ДЕТАЛЬНЫЙ АНАЛИЗ ВСЕХ TON ТРАНЗАКЦИЙ User #25
  console.log('\n1️⃣ ДЕТАЛЬНЫЙ АНАЛИЗ TON ТРАНЗАКЦИЙ User #25');
  console.log('-'.repeat(60));
  
  const { data: allTransactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 25)
    .order('created_at', { ascending: true }); // По возрастанию для трассинга

  if (txError) {
    console.error('❌ Ошибка получения транзакций:', txError.message);
    return;
  }

  // Фильтруем только TON транзакции (включая 0 значения если есть metadata с TON)
  const tonTransactions = allTransactions.filter(tx => 
    parseFloat(tx.amount_ton || 0) > 0 || 
    tx.currency === 'TON' ||
    tx.description?.includes('TON deposit') ||
    tx.description?.includes('TON') ||
    (tx.metadata && JSON.stringify(tx.metadata).includes('TON'))
  );

  console.log(`📊 Всего транзакций User #25: ${allTransactions.length}`);
  console.log(`🪙 TON транзакций: ${tonTransactions.length}`);

  // Построим хронологию TON операций
  let runningBalance = 0;
  console.log('\n📈 ХРОНОЛОГИЯ TON ОПЕРАЦИЙ (РАСЧЕТНЫЙ БАЛАНС):');
  console.log('Дата | ID | Тип | Сумма | Баланс | Описание');
  console.log('-'.repeat(80));

  tonTransactions.forEach(tx => {
    const amount = parseFloat(tx.amount_ton || 0);
    const prevBalance = runningBalance;
    
    // Определяем операцию (+ или -)
    if (tx.type === 'FARMING_REWARD' || tx.type === 'REFERRAL_REWARD') {
      runningBalance += amount;
    } else if (tx.type?.includes('WITHDRAWAL') || tx.description?.includes('withdrawal')) {
      runningBalance -= amount;
    } else {
      runningBalance += amount; // По умолчанию прибавляем
    }

    const date = tx.created_at.split('T')[0];
    const sign = runningBalance > prevBalance ? '+' : (runningBalance < prevBalance ? '-' : '=');
    
    console.log(`${date} | ${tx.id} | ${tx.type} | ${sign}${amount} | ${runningBalance.toFixed(6)} | ${(tx.description || '').substring(0, 40)}...`);
  });

  console.log(`\n📊 ИТОГО РАСЧЕТНЫЙ БАЛАНС: ${runningBalance.toFixed(6)} TON`);

  // 2. ПРОВЕРКА ФАКТИЧЕСКОГО БАЛАНСА
  console.log('\n2️⃣ ФАКТИЧЕСКИЙ БАЛАНС User #25');
  console.log('-'.repeat(60));
  
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, username, balance_ton, balance_uni, created_at')
    .eq('id', 25)
    .single();

  if (userError) {
    console.error('❌ Ошибка получения пользователя:', userError.message);
    return;
  }

  const actualBalance = parseFloat(userData.balance_ton || 0);
  const discrepancy = runningBalance - actualBalance;

  console.log(`👤 User #25 (@${userData.username})`);
  console.log(`💰 Фактический баланс: ${actualBalance} TON`);
  console.log(`📊 Расчетный баланс: ${runningBalance.toFixed(6)} TON`);
  console.log(`⚠️  РАСХОЖДЕНИЕ: ${discrepancy.toFixed(6)} TON`);
  console.log(`📅 Дата регистрации: ${userData.created_at}`);

  // 3. ПОИСК ОПЕРАЦИЙ СПИСАНИЯ В ДРУГИХ ТАБЛИЦАХ
  console.log('\n3️⃣ ПОИСК ОПЕРАЦИЙ СПИСАНИЯ В СИСТЕМЕ');
  console.log('-'.repeat(60));

  // Проверяем withdraw_requests
  const { data: withdrawals, error: withdrawError } = await supabase
    .from('withdraw_requests')
    .select('*')
    .eq('user_id', 25)
    .order('created_at', { ascending: false });

  console.log(`💸 Заявок на вывод: ${withdrawals?.length || 0}`);
  if (withdrawals && withdrawals.length > 0) {
    console.log('📋 ДЕТАЛИ ВЫВОДОВ:');
    withdrawals.forEach(w => {
      console.log(`• ID: ${w.id} | ${w.created_at.split('T')[0]} | ${w.amount_ton} TON | Status: ${w.status}`);
    });
  }

  // 4. АНАЛИЗ BALANCE HISTORY (если есть)
  console.log('\n4️⃣ ПОИСК ИСТОРИИ ИЗМЕНЕНИЙ БАЛАНСА');
  console.log('-'.repeat(60));

  // Попробуем найти таблицу с историей балансов
  const { data: balanceHistory, error: historyError } = await supabase
    .from('balance_history')
    .select('*')
    .eq('user_id', 25)
    .order('created_at', { ascending: false })
    .limit(20);

  if (historyError && !historyError.message.includes('does not exist')) {
    console.error('❌ Ошибка получения истории баланса:', historyError.message);
  } else if (balanceHistory && balanceHistory.length > 0) {
    console.log(`📊 Записей истории баланса: ${balanceHistory.length}`);
    balanceHistory.slice(0, 10).forEach(h => {
      console.log(`• ${h.created_at.split('T')[0]} | TON: ${h.balance_ton_before} → ${h.balance_ton_after} | Операция: ${h.operation_type}`);
    });
  } else {
    console.log('ℹ️  Таблица balance_history не найдена или пуста');
  }

  // 5. АНАЛИЗ ВСЕХ ИЗМЕНЕНИЙ БАЛАНСА User #25
  console.log('\n5️⃣ АНАЛИЗ ВСЕХ ВОЗМОЖНЫХ СПИСАНИЙ');
  console.log('-'.repeat(60));

  // Ищем все типы транзакций, которые могут списывать баланс
  const suspiciousTransactions = allTransactions.filter(tx => {
    const desc = (tx.description || '').toLowerCase();
    const type = (tx.type || '').toLowerCase();
    
    return desc.includes('subtract') ||
           desc.includes('deduct') ||
           desc.includes('withdraw') ||
           desc.includes('rollback') ||
           desc.includes('reverse') ||
           desc.includes('cancel') ||
           type.includes('withdrawal') ||
           type.includes('fee') ||
           type.includes('commission');
  });

  console.log(`🔍 Подозрительных транзакций: ${suspiciousTransactions.length}`);
  if (suspiciousTransactions.length > 0) {
    console.log('⚠️  НАЙДЕНЫ ПОДОЗРИТЕЛЬНЫЕ ОПЕРАЦИИ:');
    suspiciousTransactions.forEach(tx => {
      console.log(`• ID: ${tx.id} | ${tx.created_at.split('T')[0]} | Type: ${tx.type}`);
      console.log(`  TON: ${tx.amount_ton} | UNI: ${tx.amount_uni} | Currency: ${tx.currency}`);
      console.log(`  Описание: ${tx.description}`);
      console.log('  ---');
    });
  }

  // 6. АНАЛИЗ МЕТАДАННЫХ ТРАНЗАКЦИЙ
  console.log('\n6️⃣ АНАЛИЗ МЕТАДАННЫХ И ИСТОЧНИКОВ');
  console.log('-'.repeat(60));

  const transactionsWithMetadata = tonTransactions.filter(tx => tx.metadata && Object.keys(tx.metadata).length > 0);
  console.log(`📊 TON транзакций с метаданными: ${transactionsWithMetadata.length}`);

  if (transactionsWithMetadata.length > 0) {
    console.log('📋 АНАЛИЗ МЕТАДАННЫХ:');
    transactionsWithMetadata.slice(0, 5).forEach(tx => {
      console.log(`• ID: ${tx.id} | ${tx.amount_ton} TON`);
      console.log(`  Metadata: ${JSON.stringify(tx.metadata, null, 2)}`);
      console.log(`  Source: ${tx.source || 'N/A'}`);
      console.log('  ---');
    });
  }

  // 7. ИТОГОВЫЙ ДИАГНОЗ
  console.log('\n7️⃣ ИТОГОВЫЙ ДИАГНОЗ ПРОБЛЕМЫ');
  console.log('='.repeat(60));

  console.log(`📊 КЛЮЧЕВЫЕ ФАКТЫ:`);
  console.log(`   • TON транзакций: ${tonTransactions.length}`);
  console.log(`   • Расчетный баланс: ${runningBalance.toFixed(6)} TON`);
  console.log(`   • Фактический баланс: ${actualBalance} TON`);
  console.log(`   • ПРОПАЛО: ${discrepancy.toFixed(6)} TON`);
  console.log(`   • Заявок на вывод: ${withdrawals?.length || 0}`);
  console.log(`   • Подозрительных операций: ${suspiciousTransactions.length}`);

  if (Math.abs(discrepancy) > 0.001) {
    console.log('\n🚨 ПОДТВЕРЖДЕНА КРИТИЧНАЯ ПРОБЛЕМА:');
    console.log(`   СИСТЕМА ПОТЕРЯЛА ${Math.abs(discrepancy).toFixed(6)} TON из баланса User #25!`);
    
    if (suspiciousTransactions.length > 0) {
      console.log('   ⚠️  Найдены подозрительные операции - возможна причина списания');
    } else {
      console.log('   ❓ Причина списания НЕ найдена в транзакциях - возможен системный баг');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📋 СРОЧНЫЕ ДЕЙСТВИЯ:');
  console.log('1. Проверить логи BalanceManager.subtractBalance() за последние дни');
  console.log('2. Найти системные процессы, которые могут списывать баланс');
  console.log('3. Восстановить пропавшие средства пользователю');
  console.log('4. Исправить баг, вызывающий потерю средств');
  console.log('='.repeat(80));
}

criticalBalanceTracing().catch(console.error);