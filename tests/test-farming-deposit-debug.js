/**
 * ТЕСТИРОВАНИЕ: Депозит UNI фарминга с детальной диагностикой
 * Цель: Проверить работу исправленного кода депозита
 */

import { supabase } from './core/supabase.js';
import { balanceManager } from './core/BalanceManager.js';

async function testFarmingDeposit() {
  console.log('=== ТЕСТИРОВАНИЕ ДЕПОЗИТА UNI ФАРМИНГА ===');
  
  const userId = 62;
  const depositAmount = 1; // 1 UNI для теста
  
  try {
    // 1. Проверим текущий баланс
    console.log('\n1. Проверка текущего баланса...');
    const currentBalance = await balanceManager.getUserBalance(userId);
    console.log('Текущий баланс:', JSON.stringify(currentBalance, null, 2));
    
    if (!currentBalance.success) {
      console.error('Не удалось получить текущий баланс');
      return;
    }
    
    const initialUniBalance = currentBalance.balance.balance_uni;
    console.log(`Начальный баланс UNI: ${initialUniBalance}`);
    
    // 2. Проверим, достаточно ли средств
    if (initialUniBalance < depositAmount) {
      console.error(`Недостаточно средств: ${initialUniBalance} < ${depositAmount}`);
      return;
    }
    
    // 3. Выполним депозит через BalanceManager
    console.log('\n2. Выполнение депозита...');
    const balanceResult = await balanceManager.subtractBalance(
      userId,
      depositAmount,
      0,
      'Test farming deposit'
    );
    
    console.log('Результат обновления баланса:', JSON.stringify(balanceResult, null, 2));
    
    if (!balanceResult.success) {
      console.error('Не удалось обновить баланс');
      return;
    }
    
    // 4. Попробуем создать транзакцию с правильным типом
    console.log('\n3. Создание транзакции депозита...');
    
    // Сначала проверим, какие типы транзакций поддерживаются
    const { data: existingTypes, error: typesError } = await supabase
      .from('transactions')
      .select('type')
      .limit(1);
    
    console.log('Проверка доступных типов:', { existingTypes, typesError });
    
    // Попробуем создать транзакцию с типом FARMING_DEPOSIT
    const transactionPayload = {
      user_id: userId,
      type: 'FARMING_DEPOSIT',
      amount_uni: (-depositAmount).toString(),
      amount_ton: '0',
      status: 'confirmed',
      description: `Test UNI farming deposit: ${depositAmount}`
    };
    
    console.log('Payload транзакции:', JSON.stringify(transactionPayload, null, 2));
    
    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert([transactionPayload])
      .select()
      .single();
    
    if (transactionError) {
      console.error('Ошибка создания транзакции:', {
        message: transactionError.message,
        details: transactionError.details,
        code: transactionError.code,
        hint: transactionError.hint
      });
      
      // Попробуем создать с типом FARMING_REWARD
      console.log('\n4. Попытка создать транзакцию с типом FARMING_REWARD...');
      
      const fallbackPayload = {
        ...transactionPayload,
        type: 'FARMING_REWARD'
      };
      
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('transactions')
        .insert([fallbackPayload])
        .select()
        .single();
      
      if (fallbackError) {
        console.error('Ошибка создания fallback транзакции:', {
          message: fallbackError.message,
          details: fallbackError.details,
          code: fallbackError.code,
          hint: fallbackError.hint
        });
      } else {
        console.log('✅ Fallback транзакция создана успешно:', {
          id: fallbackData.id,
          type: fallbackData.type,
          amount_uni: fallbackData.amount_uni
        });
      }
    } else {
      console.log('✅ Транзакция создана успешно:', {
        id: transactionData.id,
        type: transactionData.type,
        amount_uni: transactionData.amount_uni
      });
    }
    
    // 5. Проверим финальный баланс
    console.log('\n5. Проверка финального баланса...');
    const finalBalance = await balanceManager.getUserBalance(userId);
    console.log('Финальный баланс:', JSON.stringify(finalBalance, null, 2));
    
    if (finalBalance.success) {
      const finalUniBalance = finalBalance.balance.balance_uni;
      const actualDeduction = initialUniBalance - finalUniBalance;
      
      console.log('\n=== РЕЗУЛЬТАТЫ ТЕСТА ===');
      console.log(`Начальный баланс: ${initialUniBalance} UNI`);
      console.log(`Финальный баланс: ${finalUniBalance} UNI`);
      console.log(`Фактическое списание: ${actualDeduction} UNI`);
      console.log(`Ожидаемое списание: ${depositAmount} UNI`);
      console.log(`Списание корректно: ${actualDeduction === depositAmount ? '✅ ДА' : '❌ НЕТ'}`);
    }
    
    // 6. Найдем созданную транзакцию
    console.log('\n6. Поиск созданной транзакции...');
    const { data: newTransactions, error: searchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (searchError) {
      console.error('Ошибка поиска транзакций:', searchError);
    } else {
      console.log('Последние 5 транзакций:');
      newTransactions.forEach((tx, i) => {
        console.log(`  ${i + 1}. ${tx.type} - ${tx.amount_uni} UNI (${tx.created_at})`);
      });
    }
    
  } catch (error) {
    console.error('Критическая ошибка в тесте:', error);
    console.error('Stack:', error.stack);
  }
}

// Запуск теста
testFarmingDeposit().catch(console.error);