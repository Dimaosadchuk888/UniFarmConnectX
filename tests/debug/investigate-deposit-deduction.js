/**
 * ИССЛЕДОВАНИЕ: Проблема некорректного списания монет при депозитах
 * Цель: Определить почему списывается только 1 монета вместо введенной суммы
 */

import { supabase } from './core/supabase.js';
import { balanceManager } from './core/BalanceManager.js';
import { FarmingService } from './modules/farming/service.js';

async function investigateDepositDeduction() {
  console.log('=== ИССЛЕДОВАНИЕ НЕКОРРЕКТНОГО СПИСАНИЯ ДЕПОЗИТОВ ===');
  
  const userId = 62;
  
  try {
    // 1. Проверим текущий баланс
    console.log('\n1. Проверка текущего баланса...');
    const currentBalance = await balanceManager.getUserBalance(userId);
    console.log('Текущий баланс:', JSON.stringify(currentBalance, null, 2));
    
    if (!currentBalance.success) {
      console.error('Не удалось получить текущий баланс');
      return;
    }
    
    const initialBalance = currentBalance.balance.balance_uni;
    console.log(`Начальный баланс: ${initialBalance} UNI`);
    
    // 2. Создадим экземпляр FarmingService для тестирования
    const farmingService = new FarmingService();
    
    // 3. Протестируем различные суммы депозитов
    const testAmounts = [5, 10, 25, 50];
    
    for (const testAmount of testAmounts) {
      console.log(`\n=== ТЕСТ ДЕПОЗИТА ${testAmount} UNI ===`);
      
      // Проверим баланс перед депозитом
      const beforeBalance = await balanceManager.getUserBalance(userId);
      const beforeAmount = beforeBalance.balance.balance_uni;
      
      console.log(`Баланс до депозита: ${beforeAmount} UNI`);
      
      if (beforeAmount < testAmount) {
        console.log(`❌ Пропускаем тест: недостаточно средств (${beforeAmount} < ${testAmount})`);
        continue;
      }
      
      // Выполним депозит через реальный API
      console.log(`Выполняем депозит ${testAmount} UNI через FarmingService...`);
      
      const depositResult = await farmingService.depositUniForFarming(
        '88888848',  // telegram_id пользователя 62
        testAmount.toString()
      );
      
      console.log('Результат депозита:', JSON.stringify(depositResult, null, 2));
      
      // Проверим баланс после депозита
      const afterBalance = await balanceManager.getUserBalance(userId);
      const afterAmount = afterBalance.balance.balance_uni;
      
      console.log(`Баланс после депозита: ${afterAmount} UNI`);
      
      const actualDeduction = beforeAmount - afterAmount;
      console.log(`Фактическое списание: ${actualDeduction} UNI`);
      console.log(`Ожидаемое списание: ${testAmount} UNI`);
      
      if (Math.abs(actualDeduction - testAmount) < 0.000001) {
        console.log(`✅ ТЕСТ ПРОЙДЕН: Списание корректно`);
      } else {
        console.log(`❌ ТЕСТ ПРОВАЛЕН: Списание некорректно`);
      }
      
      // Найдем созданную транзакцию
      const { data: newTransaction, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (txError) {
        console.error('Ошибка поиска транзакции:', txError);
      } else if (newTransaction && newTransaction.length > 0) {
        const tx = newTransaction[0];
        console.log(`Создана транзакция: ID=${tx.id}, type=${tx.type}, amount_uni=${tx.amount_uni}`);
      } else {
        console.log('❌ Транзакция не найдена');
      }
      
      // Небольшая пауза между тестами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 4. Проверим общие результаты
    console.log('\n=== ОБЩИЕ РЕЗУЛЬТАТЫ ===');
    
    const finalBalance = await balanceManager.getUserBalance(userId);
    const finalAmount = finalBalance.balance.balance_uni;
    
    console.log(`Финальный баланс: ${finalAmount} UNI`);
    console.log(`Общее списание: ${initialBalance - finalAmount} UNI`);
    
    // Найдем все новые транзакции
    const { data: allTransactions, error: allTxError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allTxError) {
      console.error('Ошибка получения транзакций:', allTxError);
    } else {
      console.log('\nПоследние 10 транзакций:');
      allTransactions.forEach((tx, i) => {
        console.log(`  ${i + 1}. ${tx.type} - ${tx.amount_uni} UNI (${tx.created_at})`);
      });
    }
    
    // 5. Анализируем данные пользователя
    console.log('\n=== АНАЛИЗ ДАННЫХ ПОЛЬЗОВАТЕЛЯ ===');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Ошибка получения данных пользователя:', userError);
    } else {
      console.log('Данные пользователя:');
      console.log(`  ID: ${userData.id}`);
      console.log(`  Telegram ID: ${userData.telegram_id}`);
      console.log(`  Username: ${userData.username}`);
      console.log(`  Balance UNI: ${userData.balance_uni}`);
      console.log(`  Balance TON: ${userData.balance_ton}`);
      console.log(`  UNI Deposit Amount: ${userData.uni_deposit_amount}`);
      console.log(`  UNI Farming Rate: ${userData.uni_farming_rate}`);
      console.log(`  UNI Farming Start: ${userData.uni_farming_start_timestamp}`);
    }
    
    console.log('\n=== ЗАКЛЮЧЕНИЕ ===');
    console.log('Исследование завершено. Проанализированы:');
    console.log('✅ Работа BalanceManager');
    console.log('✅ Создание транзакций');
    console.log('✅ Различные суммы депозитов');
    console.log('✅ Корректность списания');
    
  } catch (error) {
    console.error('Критическая ошибка в исследовании:', error);
    console.error('Stack:', error.stack);
  }
}

// Запуск исследования
investigateDepositDeduction().catch(console.error);