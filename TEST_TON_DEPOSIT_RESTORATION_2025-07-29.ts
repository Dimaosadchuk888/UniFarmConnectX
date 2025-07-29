#!/usr/bin/env tsx

/**
 * ТЕСТ ВОССТАНОВЛЕНИЯ СИСТЕМЫ TON ДЕПОЗИТОВ
 * Проверяет что критические функции работают после восстановления
 */

import { UnifiedTransactionService } from '../core/TransactionService';
import { BalanceManager } from '../core/BalanceManager';
import { supabase } from '../server/supabase';

const TEST_USER_ID = 999999; // Тестовый пользователь
const TEST_TON_AMOUNT = 0.001; // Минимальная тестовая сумма

async function runRestorationTest() {
  console.log('🧪 ТЕСТ ВОССТАНОВЛЕНИЯ СИСТЕМЫ TON ДЕПОЗИТОВ');
  console.log('=' .repeat(60));

  try {
    // Шаг 1: Очистка тестовых данных
    console.log('\n1️⃣ Очистка тестовых данных...');
    await supabase.from('transactions').delete().eq('user_id', TEST_USER_ID);
    await supabase.from('users').delete().eq('id', TEST_USER_ID);
    
    // Шаг 2: Создание тестового пользователя
    console.log('\n2️⃣ Создание тестового пользователя...');
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: TEST_USER_ID,
        telegram_id: TEST_USER_ID,
        username: 'test_restoration_user',
        balance_uni: 0,
        balance_ton: 0
      });

    if (userError) {
      console.error('❌ Ошибка создания пользователя:', userError);
      return;
    }
    console.log('✅ Тестовый пользователь создан');

    // Шаг 3: Получение начального баланса
    console.log('\n3️⃣ Проверка начального баланса...');
    const balanceManager = BalanceManager.getInstance();
    const initialBalance = await balanceManager.getUserBalance(TEST_USER_ID);
    
    if (!initialBalance.success) {
      console.error('❌ Ошибка получения баланса:', initialBalance.error);
      return;
    }
    
    console.log(`✅ Начальный баланс: ${initialBalance.balance?.balance_ton} TON, ${initialBalance.balance?.balance_uni} UNI`);

    // Шаг 4: КРИТИЧЕСКИЙ ТЕСТ - создание TON депозита
    console.log('\n4️⃣ КРИТИЧЕСКИЙ ТЕСТ: Создание TON депозита...');
    const transactionService = UnifiedTransactionService.getInstance();
    
    const depositResult = await transactionService.createTransaction({
      user_id: TEST_USER_ID,
      type: 'TON_DEPOSIT',
      amount_ton: TEST_TON_AMOUNT,
      amount_uni: 0,
      currency: 'TON',
      status: 'completed',
      description: 'Тест восстановления системы TON депозитов',
      metadata: {
        source: 'restoration_test',
        tx_hash: 'test_hash_' + Date.now(),
        test: true
      }
    });

    if (!depositResult.success) {
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Не удалось создать депозит:', depositResult.error);
      return;
    }
    
    console.log(`✅ Депозит создан с ID: ${depositResult.transaction_id}`);

    // Шаг 5: КРИТИЧЕСКАЯ ПРОВЕРКА - обновился ли баланс?
    console.log('\n5️⃣ КРИТИЧЕСКАЯ ПРОВЕРКА: Обновился ли баланс пользователя?');
    
    // Небольшая задержка для обработки баланса
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedBalance = await balanceManager.getUserBalance(TEST_USER_ID);
    
    if (!updatedBalance.success) {
      console.error('❌ Ошибка получения обновленного баланса:', updatedBalance.error);
      return;
    }

    const newTonBalance = updatedBalance.balance?.balance_ton || 0;
    const balanceIncrease = newTonBalance - (initialBalance.balance?.balance_ton || 0);

    console.log(`📊 Результат обновления баланса:`);
    console.log(`   Было: ${initialBalance.balance?.balance_ton} TON`);
    console.log(`   Стало: ${newTonBalance} TON`);
    console.log(`   Прирост: ${balanceIncrease} TON`);

    // Шаг 6: ОЦЕНКА РЕЗУЛЬТАТА
    console.log('\n6️⃣ ОЦЕНКА РЕЗУЛЬТАТА ВОССТАНОВЛЕНИЯ:');
    
    if (Math.abs(balanceIncrease - TEST_TON_AMOUNT) < 0.000001) {
      console.log('🎉 УСПЕХ! Система TON депозитов ВОССТАНОВЛЕНА');
      console.log('✅ Депозиты корректно зачисляются на баланс пользователя');
      console.log('✅ UnifiedTransactionService.updateUserBalance() работает');
      console.log('✅ BalanceManager.addBalance() работает');
    } else {
      console.log('❌ ПРОВАЛ! Система TON депозитов НЕ РАБОТАЕТ');
      console.log('❌ Баланс не обновился или обновился неправильно');
      console.log(`❌ Ожидали прирост: ${TEST_TON_AMOUNT} TON`);
      console.log(`❌ Фактический прирост: ${balanceIncrease} TON`);
    }

    // Шаг 7: Проверка транзакции в БД
    console.log('\n7️⃣ Проверка записи транзакции в базе данных...');
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', depositResult.transaction_id)
      .single();

    if (txError || !transaction) {
      console.error('❌ Транзакция не найдена в БД:', txError);
    } else {
      console.log('✅ Транзакция найдена в БД:', {
        id: transaction.id,
        type: transaction.type,
        amount_ton: transaction.amount_ton,
        status: transaction.status
      });
    }

  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА ТЕСТА:', error);
  } finally {
    // Очистка тестовых данных
    console.log('\n🧹 Очистка тестовых данных...');
    await supabase.from('transactions').delete().eq('user_id', TEST_USER_ID);
    await supabase.from('users').delete().eq('id', TEST_USER_ID);
    console.log('✅ Тестовые данные очищены');
  }
}

// Запуск теста
runRestorationTest().catch(console.error);