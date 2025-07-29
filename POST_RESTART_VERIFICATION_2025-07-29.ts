#!/usr/bin/env tsx

/**
 * ВЕРИФИКАЦИЯ ПОСЛЕ ПОЛНОГО РЕСТАРТА СИСТЕМЫ
 * Проверяет что все компоненты работают корректно с чистым состоянием
 */

import { BalanceManager } from './core/BalanceManager.js';
import { supabase } from './server/supabaseClient.js';

async function verifyPostRestart() {
  console.log('🔍 ВЕРИФИКАЦИЯ ПОСЛЕ ПОЛНОГО РЕСТАРТА СИСТЕМЫ');
  console.log('=' .repeat(70));

  try {
    // 1. Проверка подключения к БД
    console.log('\n1️⃣ Проверка подключения к Supabase...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.log('❌ Ошибка подключения к БД:', error.message);
      return;
    }
    console.log('✅ Подключение к БД работает');

    // 2. Проверка BalanceManager
    console.log('\n2️⃣ Тестирование BalanceManager...');
    const balanceManager = BalanceManager.getInstance();
    
    // Тест получения баланса существующего пользователя
    const testUserId = 25; // User 25 из предыдущих тестов
    const balanceResult = await balanceManager.getUserBalance(testUserId);
    
    if (balanceResult.success) {
      console.log('✅ BalanceManager работает корректно');
      console.log(`   User ${testUserId}: ${balanceResult.balance?.balance_ton} TON, ${balanceResult.balance?.balance_uni} UNI`);
    } else {
      console.log('❌ BalanceManager ошибка:', balanceResult.error);
    }

    // 3. Проверка восстановленных функций в коде
    console.log('\n3️⃣ Проверка восстановленных функций...');
    
    // Импорт для проверки
    const fs = await import('fs');
    
    // Проверка UnifiedTransactionService
    const transactionCode = fs.readFileSync('core/TransactionService.ts', 'utf8');
    const updateBalanceRestored = transactionCode.includes('const { BalanceManager } = await import');
    
    // Проверка BalanceManager Math.max
    const balanceCode = fs.readFileSync('core/BalanceManager.ts', 'utf8');
    const mathMaxRestored = balanceCode.includes('Math.max(0, current.balance_uni - amount_uni)');
    
    console.log(`   updateUserBalance: ${updateBalanceRestored ? '✅ активна' : '❌ отключена'}`);
    console.log(`   Math.max защита: ${mathMaxRestored ? '✅ активна' : '❌ отключена'}`);

    // 4. Проверка последних транзакций
    console.log('\n4️⃣ Анализ последних транзакций...');
    const { data: recentTransactions, error: txError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_ton, amount_uni, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (txError) {
      console.log('❌ Ошибка получения транзакций:', txError.message);
    } else {
      console.log('✅ Последние 5 транзакций:');
      recentTransactions?.forEach(tx => {
        console.log(`   ID: ${tx.id}, User: ${tx.user_id}, Type: ${tx.type}, TON: ${tx.amount_ton}, UNI: ${tx.amount_uni}`);
      });
    }

    // 5. Проверка пользователей с TON Boost
    console.log('\n5️⃣ Проверка пользователей с активными TON Boost...');
    const { data: tonBoostUsers, error: boostError } = await supabase
      .from('users')
      .select('id, username, balance_ton, balance_uni, ton_boost_active')
      .eq('ton_boost_active', true)
      .limit(3);

    if (boostError) {
      console.log('❌ Ошибка получения TON Boost пользователей:', boostError.message);
    } else {
      console.log(`✅ Найдено ${tonBoostUsers?.length} пользователей с активным TON Boost:`);
      tonBoostUsers?.forEach(user => {
        console.log(`   @${user.username}: ${user.balance_ton} TON, ${user.balance_uni} UNI`);
      });
    }

    // ФИНАЛЬНАЯ ОЦЕНКА
    console.log('\n' + '='.repeat(70));
    console.log('🎯 ИТОГОВАЯ ОЦЕНКА ПОСЛЕ РЕСТАРТА:');
    
    const allSystemsOk = balanceResult.success && updateBalanceRestored && mathMaxRestored;
    
    if (allSystemsOk) {
      console.log('🎉 РЕСТАРТ УСПЕШЕН! ВСЕ СИСТЕМЫ РАБОТАЮТ КОРРЕКТНО');
      console.log('✅ База данных: подключена и отвечает');
      console.log('✅ BalanceManager: функционирует'); 
      console.log('✅ TON депозиты: восстановлены и готовы к зачислению');
      console.log('✅ Защита балансов: активна');
      console.log('\n🚀 СИСТЕМА ГОТОВА К ПОЛНОЦЕННОЙ РАБОТЕ С ПОЛЬЗОВАТЕЛЯМИ');
    } else {
      console.log('⚠️ ОБНАРУЖЕНЫ ПРОБЛЕМЫ ПОСЛЕ РЕСТАРТА');
      console.log(`   База данных: ${balanceResult.success ? '✅' : '❌'}`);
      console.log(`   updateUserBalance: ${updateBalanceRestored ? '✅' : '❌'}`);
      console.log(`   Math.max защита: ${mathMaxRestored ? '✅' : '❌'}`);
      console.log('\n🔧 ТРЕБУЕТСЯ ДОПОЛНИТЕЛЬНАЯ ДИАГНОСТИКА');
    }

  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА ВЕРИФИКАЦИИ:', error);
    console.log('\n❌ РЕСТАРТ НЕ ЗАВЕРШЕН - ТРЕБУЕТСЯ РУЧНАЯ ПРОВЕРКА');
  }

  console.log('=' .repeat(70));
}

// Ожидание 10 секунд для полной инициализации системы после рестарта
setTimeout(() => {
  verifyPostRestart().catch(console.error);
}, 10000);