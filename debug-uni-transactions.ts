/**
 * Диагностика UNI транзакций - проверка почему не отображаются
 */

import { UnifiedTransactionService } from './core/TransactionService';
import { supabase } from './core/supabase';

async function debugUniTransactions() {
  console.log('\n=== ДИАГНОСТИКА UNI ТРАНЗАКЦИЙ ===\n');

  const userId = 184; // Текущий пользователь из логов
  const transactionService = UnifiedTransactionService.getInstance();

  try {
    console.log(`🔍 Проверяем транзакции для пользователя ${userId}`);

    // 1. Прямой запрос к БД - все транзакции
    console.log('\n1️⃣ ПРЯМОЙ ЗАПРОС - ВСЕ ТРАНЗАКЦИИ:');
    const { data: allTransactions, error: allError } = await supabase
      .from('transactions')
      .select('id, type, currency, amount, amount_uni, amount_ton, description, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (allError) {
      console.error('❌ Ошибка запроса всех транзакций:', allError);
    } else {
      console.log(`✅ Найдено ${allTransactions?.length || 0} транзакций`);
      allTransactions?.forEach((tx, index) => {
        console.log(`  ${index + 1}. ID: ${tx.id}, Type: ${tx.type}, Currency: ${tx.currency}, Amount: ${tx.amount}, Amount_UNI: ${tx.amount_uni}, Amount_TON: ${tx.amount_ton}`);
      });
    }

    // 2. Прямой запрос - только UNI
    console.log('\n2️⃣ ПРЯМОЙ ЗАПРОС - ТОЛЬКО UNI:');
    const { data: uniTransactions, error: uniError } = await supabase
      .from('transactions')
      .select('id, type, currency, amount, amount_uni, amount_ton, description, created_at')
      .eq('user_id', userId)
      .eq('currency', 'UNI')
      .order('created_at', { ascending: false })
      .limit(10);

    if (uniError) {
      console.error('❌ Ошибка запроса UNI транзакций:', uniError);
    } else {
      console.log(`✅ Найдено ${uniTransactions?.length || 0} UNI транзакций`);
      uniTransactions?.forEach((tx, index) => {
        console.log(`  ${index + 1}. ID: ${tx.id}, Type: ${tx.type}, Currency: ${tx.currency}, Amount: ${tx.amount}, Amount_UNI: ${tx.amount_uni}`);
      });
    }

    // 3. Через UnifiedTransactionService - ALL
    console.log('\n3️⃣ ЧЕРЕЗ СЕРВИС - ВСЕ ТРАНЗАКЦИИ:');
    const allResult = await transactionService.getUserTransactions(userId, 1, 10, { currency: 'ALL' });
    console.log(`✅ Через сервис (ALL): ${allResult.transactions.length} транзакций`);
    allResult.transactions.forEach((tx, index) => {
      console.log(`  ${index + 1}. ID: ${tx.id}, Type: ${tx.type}, Currency: ${tx.currency}, Amount: ${tx.amount}`);
    });

    // 4. Через UnifiedTransactionService - UNI
    console.log('\n4️⃣ ЧЕРЕЗ СЕРВИС - ТОЛЬКО UNI:');
    const uniResult = await transactionService.getUserTransactions(userId, 1, 10, { currency: 'UNI' });
    console.log(`✅ Через сервис (UNI): ${uniResult.transactions.length} транзакций`);
    uniResult.transactions.forEach((tx, index) => {
      console.log(`  ${index + 1}. ID: ${tx.id}, Type: ${tx.type}, Currency: ${tx.currency}, Amount: ${tx.amount}`);
    });

    // 5. Проверка поля currency
    console.log('\n5️⃣ АНАЛИЗ ПОЛЯ CURRENCY:');
    const { data: currencyAnalysis, error: currencyError } = await supabase
      .from('transactions')
      .select('currency, count()')
      .eq('user_id', userId)
      .groupBy('currency');

    if (!currencyError && currencyAnalysis) {
      console.log('📊 Распределение по валютам:');
      currencyAnalysis.forEach(row => {
        console.log(`  ${row.currency || 'NULL'}: ${row.count} транзакций`);
      });
    }

    // 6. Проверка последних 20 записей
    console.log('\n6️⃣ ПОСЛЕДНИЕ 20 ЗАПИСЕЙ (детальный анализ):');
    const { data: recentTransactions, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!recentError && recentTransactions) {
      recentTransactions.forEach((tx, index) => {
        const hasUni = parseFloat(tx.amount_uni || '0') > 0;
        const hasTon = parseFloat(tx.amount_ton || '0') > 0;
        console.log(`  ${index + 1}. [${tx.id}] ${tx.type} | Currency: "${tx.currency}" | Amount: ${tx.amount} | UNI: ${tx.amount_uni} (${hasUni ? 'YES' : 'NO'}) | TON: ${tx.amount_ton} (${hasTon ? 'YES' : 'NO'})`);
      });
    }

    console.log('\n🎯 ВЫВОДЫ:');
    console.log('1. Сравните количество UNI транзакций между прямым запросом и сервисом');
    console.log('2. Проверьте правильность заполнения поля "currency"');
    console.log('3. Если service возвращает меньше - проблема в фильтрации TransactionService.ts:262-264');

  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error);
  }
}

// Запуск диагностики
debugUniTransactions().then(() => {
  console.log('\n🏁 Диагностика завершена');
  process.exit(0);
}).catch(error => {
  console.error('❌ Фатальная ошибка:', error);
  process.exit(1);
});