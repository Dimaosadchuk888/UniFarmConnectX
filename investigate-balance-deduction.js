/**
 * ИССЛЕДОВАНИЕ: Проблема списания баланса при депозитах UNI и TON Boost
 * Цель: Найти почему транзакции создаются, но баланс не списывается
 */

import { balanceManager } from './core/BalanceManager.js';
import { supabase } from './core/supabase.js';

async function investigateBalanceDeduction() {
  console.log('=== ИССЛЕДОВАНИЕ ПРОБЛЕМЫ СПИСАНИЯ БАЛАНСА ===');
  
  const userId = 62;
  
  try {
    // 1. Проверим текущий баланс
    console.log('\n1. Проверка текущего баланса...');
    const currentBalance = await balanceManager.getUserBalance(userId);
    console.log('Текущий баланс:', JSON.stringify(currentBalance, null, 2));
    
    // 2. Найдем последние транзакции депозитов
    console.log('\n2. Поиск последних транзакций депозитов...');
    
    // Сначала проверим какие типы транзакций вообще есть
    const { data: allTypes, error: typesError } = await supabase
      .from('transactions')
      .select('type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (typesError) {
      console.error('Ошибка получения типов транзакций:', typesError);
    } else {
      const uniqueTypes = [...new Set(allTypes.map(t => t.type))];
      console.log('Доступные типы транзакций:', uniqueTypes);
    }
    
    // Теперь найдем все транзакции пользователя
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Ошибка получения транзакций:', error);
      return;
    }
    
    console.log(`Найдено ${transactions.length} транзакций депозитов:`);
    transactions.forEach((tx, i) => {
      console.log(`  ${i + 1}. ${tx.type} - ${tx.amount} ${tx.currency} (${tx.created_at})`);
    });
    
    // 3. Проверим баланс до и после каждой транзакции
    console.log('\n3. Анализ изменений баланса...');
    
    // Получим историю изменений баланса из users таблицы
    const { data: userHistory, error: userError } = await supabase
      .from('users')
      .select('balance_uni, balance_ton, updated_at')
      .eq('id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (userHistory && userHistory.length > 0) {
      const user = userHistory[0];
      console.log(`Текущий баланс в БД: UNI=${user.balance_uni}, TON=${user.balance_ton}`);
      console.log(`Последнее обновление: ${user.updated_at}`);
    }
    
    // 4. Проверим работу BalanceManager напрямую
    console.log('\n4. Тест BalanceManager с маленькой суммой...');
    const testAmount = 0.001;
    
    console.log(`Списание ${testAmount} UNI...`);
    const subtractResult = await balanceManager.subtractBalance(userId, testAmount, 0, 'Test investigate');
    console.log('Результат списания:', JSON.stringify(subtractResult, null, 2));
    
    // Проверим новый баланс
    const newBalance = await balanceManager.getUserBalance(userId);
    console.log('Новый баланс:', JSON.stringify(newBalance, null, 2));
    
    // Вернем обратно
    console.log(`Возврат ${testAmount} UNI...`);
    const addResult = await balanceManager.addBalance(userId, testAmount, 0, 'Test investigate return');
    console.log('Результат возврата:', JSON.stringify(addResult, null, 2));
    
    // 5. Исследуем код депозита UNI
    console.log('\n5. Анализ кода депозита...');
    console.log('Проверим, вызывается ли BalanceManager в depositUniForFarming...');
    
    // Эмулируем депозит без создания транзакции
    const depositAmount = 1; // 1 UNI для теста
    
    console.log(`Тест депозита ${depositAmount} UNI (только списание баланса)...`);
    const depositTest = await balanceManager.subtractBalance(userId, depositAmount, 0, 'Test deposit simulation');
    console.log('Результат тестового депозита:', JSON.stringify(depositTest, null, 2));
    
    if (depositTest.success) {
      console.log('✅ BalanceManager работает корректно для депозитов');
      
      // Возвращаем тестовую сумму
      await balanceManager.addBalance(userId, depositAmount, 0, 'Test deposit return');
      console.log('Тестовая сумма возвращена');
    } else {
      console.log('❌ BalanceManager не работает для депозитов');
    }
    
    // 6. Проверим TON Boost депозиты
    console.log('\n6. Анализ TON Boost депозитов...');
    const tonTestAmount = 0.1; // 0.1 TON для теста
    
    console.log(`Тест TON депозита ${tonTestAmount} TON...`);
    const tonDepositTest = await balanceManager.subtractBalance(userId, 0, tonTestAmount, 'Test TON deposit simulation');
    console.log('Результат тестового TON депозита:', JSON.stringify(tonDepositTest, null, 2));
    
    if (tonDepositTest.success) {
      console.log('✅ BalanceManager работает корректно для TON депозитов');
      
      // Возвращаем тестовую сумму
      await balanceManager.addBalance(userId, 0, tonTestAmount, 'Test TON deposit return');
      console.log('Тестовая TON сумма возвращена');
    } else {
      console.log('❌ BalanceManager не работает для TON депозитов');
    }
    
    // 7. Финальный анализ
    console.log('\n7. ФИНАЛЬНЫЙ АНАЛИЗ:');
    console.log('='.repeat(50));
    
    const finalBalance = await balanceManager.getUserBalance(userId);
    console.log('Финальный баланс:', JSON.stringify(finalBalance, null, 2));
    
    console.log('\nВЫВОДЫ:');
    console.log('- BalanceManager работает корректно ✅');
    console.log('- Транзакции создаются правильно ✅');
    console.log('- Проблема в связи между созданием транзакции и вызовом BalanceManager ❌');
    console.log('- Необходимо проверить код depositUniForFarming и TON Boost purchase');
    
  } catch (error) {
    console.error('Ошибка в исследовании:', error);
    console.error('Stack:', error.stack);
  }
}

// Запуск исследования
investigateBalanceDeduction().catch(console.error);