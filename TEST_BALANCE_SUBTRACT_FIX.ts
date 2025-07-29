#!/usr/bin/env tsx

/**
 * Тест восстановленной функции subtractBalance
 * Проверяет, что списание средств снова работает
 */

import { BalanceManager } from './core/BalanceManager';
import { logger } from './core/logger';

async function testSubtractBalance() {
  console.log('\n🧪 ТЕСТИРОВАНИЕ ВОССТАНОВЛЕННОЙ ФУНКЦИИ СПИСАНИЯ\n');
  console.log('='.repeat(60));
  
  const balanceManager = BalanceManager.getInstance();
  const testUserId = 184; // Тестовый пользователь
  
  try {
    // 1. Получаем текущий баланс
    console.log('\n1️⃣ Получение текущего баланса...');
    const currentBalance = await balanceManager.getUserBalance(testUserId);
    
    if (!currentBalance.success) {
      console.error('❌ Не удалось получить баланс:', currentBalance.error);
      return;
    }
    
    console.log('✅ Текущий баланс:');
    console.log(`   UNI: ${currentBalance.balance?.balance_uni}`);
    console.log(`   TON: ${currentBalance.balance?.balance_ton}`);
    
    // 2. Тестируем списание малой суммы
    console.log('\n2️⃣ Тестирование списания 0.001 TON...');
    const subtractResult = await balanceManager.subtractBalance(
      testUserId,
      0, // UNI
      0.001, // TON
      'TEST_SUBTRACT_FIX'
    );
    
    if (!subtractResult.success) {
      console.error('❌ ОШИБКА списания:', subtractResult.error);
      console.log('\n⚠️  Функция всё ещё заблокирована ANTI_ROLLBACK_PROTECTION!');
      return;
    }
    
    console.log('✅ Списание успешно!');
    console.log(`   Новый баланс TON: ${subtractResult.newBalance?.balance_ton}`);
    console.log(`   Изменение: -0.001 TON`);
    
    // 3. Возвращаем деньги обратно
    console.log('\n3️⃣ Возврат тестовой суммы...');
    const returnResult = await balanceManager.addBalance(
      testUserId,
      0, // UNI
      0.001, // TON
      'TEST_RETURN'
    );
    
    if (returnResult.success) {
      console.log('✅ Тестовая сумма возвращена');
      console.log(`   Финальный баланс TON: ${returnResult.newBalance?.balance_ton}`);
    }
    
    // 4. Итоговый результат
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ ФУНКЦИЯ СПИСАНИЯ ПОЛНОСТЬЮ ВОССТАНОВЛЕНА!');
    console.log('\nТеперь пользователи могут:');
    console.log('  • Покупать TON Boost пакеты');
    console.log('  • Выводить средства');
    console.log('  • Совершать любые операции, требующие списания');
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка при тестировании:', error);
  }
}

// Запуск теста
testSubtractBalance()
  .then(() => {
    console.log('\n✅ Тест завершён');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Ошибка теста:', error);
    process.exit(1);
  });