/**
 * ПРЯМОЕ ТЕСТИРОВАНИЕ BalanceManager - воспроизводим баг обновления TON баланса
 */

import { supabase } from './core/supabaseClient';

async function testBalanceManagerDirectly() {
  console.log('🔬 ПРЯМОЕ ТЕСТИРОВАНИЕ BalanceManager');
  console.log('Воспроизводим проблему обновления TON баланса для User ID 25');
  console.log('='.repeat(80));

  try {
    // 1. ПОЛУЧАЕМ ТЕКУЩИЙ БАЛАНС
    console.log('\n1️⃣ ТЕКУЩИЙ БАЛАНС User ID 25:');
    
    const { data: currentUser, error: currentError } = await supabase
      .from('users')
      .select('id, balance_ton, balance_uni')
      .eq('id', 25)
      .single();

    if (currentError || !currentUser) {
      console.error('❌ Не удалось получить пользователя:', currentError);
      return;
    }

    console.log(`   Balance TON: ${currentUser.balance_ton}`);
    console.log(`   Balance UNI: ${currentUser.balance_uni}`);

    // 2. ИМПОРТИРУЕМ BalanceManager
    console.log('\n2️⃣ ИМПОРТ BalanceManager:');
    
    let BalanceManager;
    try {
      const balanceModule = await import('./core/BalanceManager');
      BalanceManager = balanceModule.BalanceManager;
      console.log('✅ BalanceManager импортирован успешно');
    } catch (importError) {
      console.error('❌ Ошибка импорта BalanceManager:', importError);
      return;
    }

    // 3. СОЗДАЕМ ЭКЗЕМПЛЯР
    console.log('\n3️⃣ СОЗДАНИЕ ЭКЗЕМПЛЯРА BalanceManager:');
    
    let balanceManager;
    try {
      balanceManager = BalanceManager.getInstance();
      console.log('✅ Экземпляр BalanceManager создан');
    } catch (instanceError) {
      console.error('❌ Ошибка создания экземпляра:', instanceError);
      return;
    }

    // 4. ТЕСТИРУЕМ getUserBalance
    console.log('\n4️⃣ ТЕСТИРОВАНИЕ getUserBalance():');
    
    try {
      const getUserBalanceResult = await balanceManager.getUserBalance(25);
      
      if (getUserBalanceResult.success) {
        console.log('✅ getUserBalance() работает:');
        console.log(`   Balance TON: ${getUserBalanceResult.balance.balance_ton}`);
        console.log(`   Balance UNI: ${getUserBalanceResult.balance.balance_uni}`);
      } else {
        console.error('❌ getUserBalance() провалился:', getUserBalanceResult.error);
        return;
      }
    } catch (getUserError) {
      console.error('❌ Исключение в getUserBalance():', getUserError);
      return;
    }

    // 5. ТЕСТИРУЕМ updateUserBalance с минимальной суммой
    console.log('\n5️⃣ ТЕСТИРОВАНИЕ updateUserBalance() с 0.000001 TON:');
    
    const oldBalance = currentUser.balance_ton;
    const testAmount = 0.000001;
    
    try {
      const updateResult = await balanceManager.updateUserBalance({
        user_id: 25,
        amount_uni: 0,
        amount_ton: testAmount,
        operation: 'add',
        source: 'TEST_ADD_TON'
      });
      
      if (updateResult.success) {
        console.log('✅ updateUserBalance() УСПЕШНО:');
        console.log(`   Старый баланс: ${oldBalance}`);
        console.log(`   Добавлено: ${testAmount}`);
        console.log(`   Новый баланс: ${updateResult.newBalance?.balance_ton}`);
        
        // Проверяем что изменение реально применилось
        const { data: verifyUser, error: verifyError } = await supabase
          .from('users')
          .select('balance_ton')
          .eq('id', 25)
          .single();

        if (verifyError) {
          console.error('❌ Ошибка проверки обновления:', verifyError);
        } else {
          console.log(`   Подтверждение в БД: ${verifyUser.balance_ton}`);
          
          if (Math.abs(verifyUser.balance_ton - (oldBalance + testAmount)) < 0.0000001) {
            console.log('✅ Обновление подтверждено в БД!');
          } else {
            console.log('❌ Обновление НЕ сохранилось в БД!');
          }
        }
        
      } else {
        console.error('❌ updateUserBalance() ПРОВАЛИЛСЯ:', updateResult.error);
      }
    } catch (updateError) {
      console.error('❌ Исключение в updateUserBalance():', updateError);
    }

    // 6. ТЕСТИРУЕМ addBalance с 1 TON (как в транзакции 1910979)
    console.log('\n6️⃣ ТЕСТИРОВАНИЕ addBalance() с 1 TON:');
    
    // Получаем актуальный баланс
    const { data: freshUser, error: freshError } = await supabase
      .from('users')
      .select('balance_ton')
      .eq('id', 25)
      .single();

    if (freshError) {
      console.error('❌ Не удалось получить актуальный баланс:', freshError);
      return;
    }

    const currentBalance = freshUser.balance_ton;
    
    try {
      console.log(`   Текущий баланс: ${currentBalance}`);
      console.log(`   Попытка добавить: 1 TON`);
      console.log(`   Ожидаемый результат: ${currentBalance + 1}`);
      
      const addResult = await balanceManager.addBalance(25, 0, 1, 'TEST_TON_DEPOSIT');
      
      if (addResult.success) {
        console.log('✅ addBalance() УСПЕШНО:');
        console.log(`   Новый баланс: ${addResult.newBalance?.balance_ton}`);
        
        // Проверяем в БД
        const { data: finalUser, error: finalError } = await supabase
          .from('users')
          .select('balance_ton')
          .eq('id', 25)
          .single();

        if (finalError) {
          console.error('❌ Ошибка финальной проверки:', finalError);
        } else {
          console.log(`   Финальный баланс в БД: ${finalUser.balance_ton}`);
          
          if (Math.abs(finalUser.balance_ton - (currentBalance + 1)) < 0.000001) {
            console.log('✅ 1 TON успешно добавлен!');
          } else {
            console.log('❌ 1 TON НЕ добавился в БД!');
            console.log(`   Ожидалось: ${currentBalance + 1}`);
            console.log(`   Получили: ${finalUser.balance_ton}`);
            console.log(`   Разница: ${finalUser.balance_ton - currentBalance}`);
          }
        }
        
      } else {
        console.error('❌ addBalance() ПРОВАЛИЛСЯ:', addResult.error);
      }
    } catch (addError) {
      console.error('❌ Исключение в addBalance():', addError);
    }

    // 7. ФИНАЛЬНАЯ ДИАГНОСТИКА
    console.log('\n' + '='.repeat(80));
    console.log('7️⃣ ФИНАЛЬНАЯ ДИАГНОСТИКА:');
    
    console.log('\n✅ ЧТО ПРОТЕСТИРОВАНО:');
    console.log('   - Импорт BalanceManager');
    console.log('   - Создание экземпляра');
    console.log('   - getUserBalance()');
    console.log('   - updateUserBalance()');
    console.log('   - addBalance()');
    console.log('   - Проверка изменений в БД');
    
    console.log('\n💡 ВЫВОДЫ:');
    console.log('   Если тесты прошли успешно - проблема в вызове BalanceManager из UnifiedTransactionService');
    console.log('   Если тесты провалились - проблема в самом BalanceManager');

  } catch (error) {
    console.error('💥 Критическая ошибка теста:', error);
  }
}

// Запускаем тест
testBalanceManagerDirectly().then(() => {
  console.log('\n✅ Тест завершен');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Фатальная ошибка:', error);
  process.exit(1);
});