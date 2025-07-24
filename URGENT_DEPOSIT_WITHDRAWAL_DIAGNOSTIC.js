#!/usr/bin/env node

/**
 * СРОЧНАЯ ДИАГНОСТИКА: ПОЧЕМУ СИСТЕМА СПИСЫВАЕТ ДЕПОЗИТЫ С БАЛАНСА
 * Анализирует все транзакции User #25 и других пользователей за последние дни
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function urgentDepositWithdrawalDiagnostic() {
  console.log('🚨 СРОЧНАЯ ДИАГНОСТИКА: ПОЧЕМУ СИСТЕМА СПИСЫВАЕТ ДЕПОЗИТЫ С БАЛАНСА');
  console.log('='.repeat(80));
  console.log(`📅 ${new Date().toLocaleString('ru-RU')}`);
  
  // 1. АНАЛИЗ ТРАНЗАКЦИЙ User #25 ЗА ПОСЛЕДНИЕ 5 ДНЕЙ
  console.log('\n1️⃣ ПОЛНЫЙ АНАЛИЗ ТРАНЗАКЦИЙ USER #25');
  console.log('-'.repeat(60));
  
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  
  const { data: user25Transactions, error: user25Error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 25)
    .gte('created_at', fiveDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  if (user25Error) {
    console.error('❌ Ошибка получения транзакций User #25:', user25Error.message);
    return;
  }

  console.log(`📊 Всего транзакций User #25 за 5 дней: ${user25Transactions.length}`);
  
  // Группируем по типам и знакам операций
  const transactionAnalysis = {};
  let totalTonDeposits = 0;
  let totalTonWithdrawals = 0;
  let totalTonBalance = 0;

  user25Transactions.forEach(tx => {
    const type = tx.type;
    const tonAmount = parseFloat(tx.amount_ton || 0);
    const description = tx.description || '';
    
    if (!transactionAnalysis[type]) {
      transactionAnalysis[type] = { count: 0, totalTon: 0, examples: [] };
    }
    
    transactionAnalysis[type].count++;
    transactionAnalysis[type].totalTon += tonAmount;
    
    if (transactionAnalysis[type].examples.length < 3) {
      transactionAnalysis[type].examples.push({
        id: tx.id,
        amount: tonAmount,
        description: description.substring(0, 50),
        date: tx.created_at.split('T')[0]
      });
    }
    
    // Анализируем влияние на баланс
    if (description.includes('deposit') || description.includes('TON deposit')) {
      totalTonDeposits += tonAmount;
    } else if (description.includes('withdrawal') || type.includes('WITHDRAWAL')) {
      totalTonWithdrawals += tonAmount;
    }
    
    // Считаем общий баланс (+ для доходов, - для расходов)
    if (type === 'FARMING_REWARD' || type === 'REFERRAL_REWARD') {
      totalTonBalance += tonAmount;
    } else if (type.includes('WITHDRAWAL') || description.includes('withdrawal')) {
      totalTonBalance -= tonAmount;
    }
  });

  console.log('\n📋 АНАЛИЗ ТРАНЗАКЦИЙ ПО ТИПАМ:');
  Object.entries(transactionAnalysis).forEach(([type, data]) => {
    console.log(`\n🔸 ${type}:`);
    console.log(`   Количество: ${data.count}`);
    console.log(`   Общая сумма TON: ${data.totalTon.toFixed(6)}`);
    console.log(`   Примеры:`);
    data.examples.forEach(ex => {
      console.log(`     • ID:${ex.id} | ${ex.date} | ${ex.amount} TON | ${ex.description}...`);
    });
  });

  console.log(`\n💰 СВОДКА ДВИЖЕНИЯ TON User #25:`);
  console.log(`   Депозиты: +${totalTonDeposits.toFixed(6)} TON`);
  console.log(`   Выводы: -${totalTonWithdrawals.toFixed(6)} TON`);
  console.log(`   Расчетный баланс: ${totalTonBalance.toFixed(6)} TON`);

  // 2. ПОИСК НЕГАТИВНЫХ ТРАНЗАКЦИЙ (СПИСАНИЯ)
  console.log('\n2️⃣ ПОИСК НЕГАТИВНЫХ ТРАНЗАКЦИЙ (СПИСАНИЯ БАЛАНСА)');
  console.log('-'.repeat(60));
  
  const negativeTransactions = user25Transactions.filter(tx => {
    const description = (tx.description || '').toLowerCase();
    const type = tx.type || '';
    return description.includes('withdrawal') || 
           description.includes('списани') || 
           description.includes('вывод') ||
           type.includes('WITHDRAWAL') ||
           parseFloat(tx.amount_ton || 0) < 0;
  });

  console.log(`🔍 Найдено негативных транзакций: ${negativeTransactions.length}`);
  
  if (negativeTransactions.length > 0) {
    console.log('\n📋 ДЕТАЛИ НЕГАТИВНЫХ ТРАНЗАКЦИЙ:');
    negativeTransactions.forEach(tx => {
      console.log(`• ID: ${tx.id} | ${tx.created_at.split('T')[0]}`);
      console.log(`  Тип: ${tx.type} | Сумма: ${tx.amount_ton} TON`);
      console.log(`  Описание: ${tx.description}`);
      console.log(`  Статус: ${tx.status}`);
      console.log('  ---');
    });
  }

  // 3. ПРОВЕРКА ТЕКУЩЕГО БАЛАНСА User #25
  console.log('\n3️⃣ ТЕКУЩИЙ БАЛАНС User #25');
  console.log('-'.repeat(60));
  
  const { data: user25Data, error: balanceError } = await supabase
    .from('users')
    .select('id, username, balance_ton, balance_uni')
    .eq('id', 25)
    .single();

  if (balanceError) {
    console.error('❌ Ошибка получения баланса:', balanceError.message);
  } else {
    const actualBalance = parseFloat(user25Data.balance_ton || 0);
    const difference = actualBalance - totalTonBalance;
    
    console.log(`👤 User #25 (@${user25Data.username})`);
    console.log(`💰 Фактический баланс: ${actualBalance} TON`);
    console.log(`📊 Расчетный баланс: ${totalTonBalance.toFixed(6)} TON`);
    console.log(`⚠️  Разница: ${difference.toFixed(6)} TON`);
    
    if (Math.abs(difference) > 0.001) {
      console.log('🚨 КРИТИЧНО: НЕСООТВЕТСТВИЕ БАЛАНСА И ТРАНЗАКЦИЙ!');
    }
  }

  // 4. ПРОВЕРКА ДРУГИХ ПОЛЬЗОВАТЕЛЕЙ С АНОМАЛИЯМИ
  console.log('\n4️⃣ ПРОВЕРКА ДРУГИХ ПОЛЬЗОВАТЕЛЕЙ С TON БАЛАНСОМ');
  console.log('-'.repeat(60));
  
  const { data: usersWithTon, error: usersError } = await supabase
    .from('users')
    .select('id, username, balance_ton')
    .gt('balance_ton', 0.05)
    .neq('id', 25)
    .order('balance_ton', { ascending: false })
    .limit(10);

  if (usersError) {
    console.error('❌ Ошибка получения пользователей:', usersError.message);
  } else {
    console.log(`👥 Найдено пользователей с TON > 0.05: ${usersWithTon.length}`);
    
    for (const user of usersWithTon.slice(0, 5)) {
      // Быстрая проверка транзакций
      const { data: userTx } = await supabase
        .from('transactions')
        .select('type, amount_ton, description, created_at')
        .eq('user_id', user.id)
        .gte('created_at', fiveDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      const depositCount = userTx?.filter(tx => 
        tx.description?.includes('deposit') || tx.description?.includes('blockchain')
      ).length || 0;
      
      const withdrawalCount = userTx?.filter(tx => 
        tx.type?.includes('WITHDRAWAL') || tx.description?.includes('withdrawal')
      ).length || 0;

      console.log(`• User #${user.id} (@${user.username || 'N/A'}): ${user.balance_ton} TON`);
      console.log(`  Депозиты: ${depositCount} | Выводы: ${withdrawalCount} | Транзакций: ${userTx?.length || 0}`);
    }
  }

  // 5. ИТОГОВЫЕ ВЫВОДЫ
  console.log('\n5️⃣ ИТОГОВЫЕ ВЫВОДЫ О ПРОБЛЕМЕ');
  console.log('='.repeat(60));
  
  const hasWithdrawals = negativeTransactions.length > 0;
  const hasBalanceDiscrepancy = user25Data && Math.abs(parseFloat(user25Data.balance_ton) - totalTonBalance) > 0.001;
  const hasRealDeposits = user25Transactions.some(tx => 
    tx.description?.includes('blockchain') && parseFloat(tx.amount_ton || 0) > 0
  );

  console.log(`📊 СТАТИСТИКА ПРОБЛЕМЫ:`);
  console.log(`   • Найдено выводов/списаний: ${negativeTransactions.length}`);
  console.log(`   • Несоответствие баланса: ${hasBalanceDiscrepancy ? 'ДА' : 'НЕТ'}`);
  console.log(`   • Есть реальные депозиты: ${hasRealDeposits ? 'ДА' : 'НЕТ'}`);
  
  if (hasWithdrawals) {
    console.log('\n🚨 НАЙДЕНЫ ОПЕРАЦИИ СПИСАНИЯ БАЛАНСА!');
    console.log('   Система действительно списывает средства с балансов пользователей.');
  }
  
  if (hasBalanceDiscrepancy) {
    console.log('\n⚠️  ОБНАРУЖЕНО НЕСООТВЕТСТВИЕ БАЛАНСА!');
    console.log('   Фактический баланс не соответствует сумме транзакций.');
  }

  if (!hasRealDeposits && parseFloat(user25Data?.balance_ton || 0) > 0) {
    console.log('\n❓ ЗАГАДКА: БАЛАНС БЕЗ ДЕПОЗИТОВ!');
    console.log('   У пользователя есть TON баланс, но нет записей о депозитах.');
  }

  console.log('\n' + '='.repeat(80));
  console.log('📋 ТРЕБУЕТСЯ СРОЧНАЯ ПРОВЕРКА:');
  console.log('1. Логов операций списания баланса');
  console.log('2. Функций автоматического списания средств');
  console.log('3. Процессов обработки неуспешных транзакций');
  console.log('='.repeat(80));
}

urgentDepositWithdrawalDiagnostic().catch(console.error);