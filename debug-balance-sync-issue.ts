#!/usr/bin/env tsx

/**
 * ОТЛАДКА ПРОБЛЕМЫ СИНХРОНИЗАЦИИ БАЛАНСА USER 25
 * Исследуем почему баланс в БД не соответствует транзакциям
 */

import { supabase } from './core/supabaseClient';
import { BalanceManager } from './core/BalanceManager';

async function debugBalanceSync() {
  console.log('🔍 ОТЛАДКА СИНХРОНИЗАЦИИ БАЛАНСА USER 25\n');

  try {
    // 1. Получаем данные через BalanceManager (как это делает приложение)
    const balanceManager = BalanceManager.getInstance();
    const managerBalance = await balanceManager.getUserBalance(25);
    
    console.log('📱 БАЛАНС ЧЕРЕЗ BALANCEMANAGER:');
    console.log(JSON.stringify(managerBalance, null, 2));

    // 2. Получаем данные напрямую из БД
    const { data: directUser, error } = await supabase
      .from('users')
      .select('balance_uni, balance_ton')
      .eq('id', 25)
      .single();

    console.log('\n🗄️ ПРЯМОЙ ЗАПРОС К БД:');
    if (directUser) {
      console.log(`UNI: ${directUser.balance_uni}`);
      console.log(`TON: ${directUser.balance_ton}`);
    }

    // 3. Тестируем обновление баланса через BalanceManager
    console.log('\n🧪 ТЕСТИРУЕМ ОБНОВЛЕНИЕ БАЛАНСА:');
    
    const currentTon = parseFloat(directUser?.balance_ton?.toString() || '0');
    const testAmount = 0.001; // Минимальное тестовое обновление
    
    console.log(`Текущий TON: ${currentTon}`);
    console.log(`Добавляем: ${testAmount} TON`);
    
    const updateResult = await balanceManager.updateUserBalance(
      25,
      'add',
      0,
      testAmount,
      'DEBUG_SYNC_TEST'
    );
    
    console.log('Результат обновления:');
    console.log(JSON.stringify(updateResult, null, 2));

    // 4. Проверяем результат
    const { data: afterUpdate, error: afterError } = await supabase
      .from('users')
      .select('balance_uni, balance_ton')
      .eq('id', 25)
      .single();

    console.log('\n📊 БАЛАНС ПОСЛЕ ТЕСТОВОГО ОБНОВЛЕНИЯ:');
    if (afterUpdate) {
      console.log(`UNI: ${afterUpdate.balance_uni}`);
      console.log(`TON: ${afterUpdate.balance_ton}`);
      console.log(`Изменение TON: ${parseFloat(afterUpdate.balance_ton.toString()) - currentTon}`);
    }

    // 5. Проверяем последние 3 депозита детально
    const { data: recent3Deposits } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .eq('type', 'TON_DEPOSIT')
      .order('created_at', { ascending: false })
      .limit(3);

    console.log('\n🔍 ДЕТАЛИ ПОСЛЕДНИХ 3 ДЕПОЗИТОВ:');
    if (recent3Deposits) {
      recent3Deposits.forEach((deposit, index) => {
        console.log(`\n${index + 1}. ID: ${deposit.id}`);
        console.log(`   Время: ${deposit.created_at}`);
        console.log(`   Сумма TON: ${deposit.amount_ton}`);
        console.log(`   Hash: ${deposit.tx_hash_unique}`);
        console.log(`   Описание: ${deposit.description}`);
      });
    }

    // 6. Исследуем кеш
    console.log('\n💾 ДИАГНОСТИКА КЕША:');
    const balanceAfterCache = await balanceManager.getUserBalance(25);
    console.log('Баланс из кеша после обновления:');
    console.log(JSON.stringify(balanceAfterCache, null, 2));

  } catch (error) {
    console.error('❌ Ошибка отладки:', error);
  }
}

debugBalanceSync().catch(console.error);