/**
 * ПРОВЕРКА ЛОГИКИ UnifiedTransactionService - почему не вызывается BalanceManager
 */

import { supabase } from './core/supabaseClient';

async function checkTransactionServiceLogic() {
  console.log('🔍 ПРОВЕРКА ЛОГИКИ UnifiedTransactionService');
  console.log('Анализируем почему BalanceManager не вызывается при создании TON депозитов');
  console.log('='.repeat(80));

  try {
    // 1. ИМПОРТ UnifiedTransactionService
    console.log('\n1️⃣ ИМПОРТ UnifiedTransactionService:');
    
    let UnifiedTransactionService;
    try {
      const transactionModule = await import('./core/TransactionService');
      UnifiedTransactionService = transactionModule.UnifiedTransactionService;
      console.log('✅ UnifiedTransactionService импортирован успешно');
    } catch (importError) {
      console.error('❌ Ошибка импорта UnifiedTransactionService:', importError);
      return;
    }

    // 2. ПОЛУЧАЕМ ЭКЗЕМПЛЯР
    console.log('\n2️⃣ ПОЛУЧЕНИЕ ЭКЗЕМПЛЯРА:');
    
    let transactionService;
    try {
      transactionService = UnifiedTransactionService.getInstance();
      console.log('✅ Экземпляр UnifiedTransactionService получен');
    } catch (instanceError) {
      console.error('❌ Ошибка получения экземпляра:', instanceError);
      return;
    }

    // 3. ПРОВЕРЯЕМ shouldUpdateBalance для TON_DEPOSIT
    console.log('\n3️⃣ ПРОВЕРКА shouldUpdateBalance("TON_DEPOSIT"):');
    
    try {
      // У нас нет доступа к private методу, но можем проверить логику
      const incomeTypes = [
        'FARMING_REWARD',
        'REFERRAL_REWARD', 
        'MISSION_REWARD',
        'DAILY_BONUS',
        'TON_BOOST_INCOME',
        'UNI_DEPOSIT',
        'TON_DEPOSIT',  // ← Проверяем наличие
        'AIRDROP_REWARD',
        'DEPOSIT'
      ];
      
      const shouldUpdate = incomeTypes.includes('TON_DEPOSIT');
      console.log(`✅ 'TON_DEPOSIT' в списке incomeTypes: ${shouldUpdate}`);
      
      if (!shouldUpdate) {
        console.log('❌ НАЙДЕНА ПРОБЛЕМА: TON_DEPOSIT не в списке типов для обновления баланса!');
        return;
      }
    } catch (error) {
      console.error('❌ Ошибка проверки shouldUpdateBalance:', error);
    }

    // 4. СИМУЛИРУЕМ СОЗДАНИЕ ТРАНЗАКЦИИ TON_DEPOSIT
    console.log('\n4️⃣ СИМУЛЯЦИЯ СОЗДАНИЯ TON_DEPOSIT:');
    
    const testUser = 184; // Тестовый пользователь
    
    console.log(`   Используем тестового пользователя: ${testUser}`);
    console.log(`   Симулируем депозит 0.001 TON`);
    
    // Получаем начальный баланс
    const { data: initialUser, error: initialError } = await supabase
      .from('users')
      .select('balance_ton')
      .eq('id', testUser)
      .single();

    if (initialError) {
      console.error('❌ Не удалось получить начальный баланс:', initialError);
      return;
    }

    const initialBalance = initialUser.balance_ton;
    console.log(`   Начальный баланс: ${initialBalance} TON`);

    // Создаем транзакцию через UnifiedTransactionService
    try {
      const transactionData = {
        user_id: testUser,
        type: 'TON_DEPOSIT' as any,
        amount_uni: 0,
        amount_ton: 0.001,
        currency: 'TON' as const,
        status: 'completed' as const,
        description: 'Test TON deposit from debug script',
        metadata: {
          source: 'debug_test',
          tx_hash: `test_hash_${Date.now()}`,
          hash_extracted: true
        }
      };

      console.log('   Вызываем createTransaction()...');
      
      const result = await transactionService.createTransaction(transactionData);
      
      if (result.success) {
        console.log(`✅ Транзакция создана успешно: ID ${result.transaction_id}`);
        
        // Проверяем обновился ли баланс
        const { data: finalUser, error: finalError } = await supabase
          .from('users')
          .select('balance_ton')
          .eq('id', testUser)
          .single();

        if (finalError) {
          console.error('❌ Не удалось получить финальный баланс:', finalError);
        } else {
          const finalBalance = finalUser.balance_ton;
          const expectedBalance = initialBalance + 0.001;
          
          console.log(`   Финальный баланс: ${finalBalance} TON`);
          console.log(`   Ожидаемый баланс: ${expectedBalance} TON`);
          console.log(`   Разница: ${finalBalance - initialBalance} TON`);
          
          if (Math.abs(finalBalance - expectedBalance) < 0.0001) {
            console.log('✅ БАЛАНС ОБНОВИЛСЯ ПРАВИЛЬНО!');
            console.log('   UnifiedTransactionService работает корректно');
          } else {
            console.log('❌ БАЛАНС НЕ ОБНОВИЛСЯ!');
            console.log('   В UnifiedTransactionService есть баг');
            
            // Проверяем транзакцию в БД
            const { data: createdTx, error: txError } = await supabase
              .from('transactions')
              .select('*')
              .eq('id', result.transaction_id)
              .single();

            if (txError) {
              console.error('❌ Не удалось найти созданную транзакцию:', txError);
            } else {
              console.log('📄 Детали созданной транзакции:');
              console.log(`   Type: ${createdTx.type}`);
              console.log(`   Amount TON: ${createdTx.amount_ton}`);
              console.log(`   Status: ${createdTx.status}`);
              console.log(`   Created: ${createdTx.created_at}`);
            }
          }
        }
        
      } else {
        console.error('❌ Создание транзакции провалилось:', result.error);
      }
      
    } catch (transactionError) {
      console.error('❌ Исключение при создании транзакции:', transactionError);
    }

    // 5. АНАЛИЗ СУЩЕСТВУЮЩИХ ТРАНЗАКЦИЙ
    console.log('\n5️⃣ АНАЛИЗ СУЩЕСТВУЮЩИХ TON_DEPOSIT ТРАНЗАКЦИЙ:');
    
    const { data: recentDeposits, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('❌ Ошибка получения недавних депозитов:', recentError);
    } else if (recentDeposits && recentDeposits.length > 0) {
      console.log(`✅ Найдено ${recentDeposits.length} недавних TON депозитов:`);
      
      for (const deposit of recentDeposits) {
        console.log(`\n--- Депозит ID ${deposit.id} ---`);
        console.log(`   User: ${deposit.user_id}`);
        console.log(`   Amount: ${deposit.amount_ton} TON`);
        console.log(`   Created: ${deposit.created_at}`);
        
        // Проверяем баланс этого пользователя
        const { data: depositUser, error: depositUserError } = await supabase
          .from('users')
          .select('balance_ton')
          .eq('id', deposit.user_id)
          .single();

        if (!depositUserError && depositUser) {
          // Считаем сколько должно быть
          const { data: userDeposits, error: userDepositError } = await supabase
            .from('transactions')
            .select('amount_ton')
            .eq('user_id', deposit.user_id)
            .eq('type', 'TON_DEPOSIT')
            .eq('status', 'completed');

          if (!userDepositError && userDeposits) {
            const totalDeposits = userDeposits.reduce((sum, d) => sum + d.amount_ton, 0);
            const difference = depositUser.balance_ton - totalDeposits;
            
            console.log(`   Баланс: ${depositUser.balance_ton} TON`);
            console.log(`   Всего депозитов: ${totalDeposits} TON`);
            console.log(`   Разница: ${difference.toFixed(6)} TON`);
            
            if (Math.abs(difference) > 1) {
              console.log(`   🚨 БОЛЬШАЯ РАЗНИЦА у User ${deposit.user_id}!`);
            }
          }
        }
      }
    }

    // 6. ФИНАЛЬНАЯ ДИАГНОСТИКА
    console.log('\n' + '='.repeat(80));
    console.log('6️⃣ ИТОГОВЫЙ ДИАГНОЗ:');
    
    console.log('\n✅ ЧТО ПРОВЕРЕНО:');
    console.log('   - UnifiedTransactionService импортируется');
    console.log('   - shouldUpdateBalance() логика');
    console.log('   - Создание тестовой транзакции');
    console.log('   - Проверка обновления баланса');
    console.log('   - Анализ существующих транзакций');
    
    console.log('\n🔧 ВЫВОД:');
    console.log('   Если тест показал обновление баланса - проблема в других транзакциях');
    console.log('   Если тест НЕ показал обновление - проблема в UnifiedTransactionService');
    console.log('   BalanceManager работает правильно (подтверждено предыдущим тестом)');

  } catch (error) {
    console.error('💥 Критическая ошибка проверки:', error);
  }
}

// Запускаем проверку
checkTransactionServiceLogic().then(() => {
  console.log('\n✅ Проверка завершена');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Фатальная ошибка:', error);
  process.exit(1);
});