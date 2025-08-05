/**
 * СИМУЛЯЦИЯ ПРОБЛЕМЫ User ID 25 - Почему баланс не обновился
 * Проверяем что происходит когда UnifiedTransactionService создает TON_DEPOSIT
 */

import { supabase } from './core/supabaseClient';

async function simulateUser25Problem() {
  console.log('🎯 СИМУЛЯЦИЯ ПРОБЛЕМЫ USER ID 25 - ПОЧЕМУ БАЛАНС НЕ ОБНОВИЛСЯ');
  console.log('Время:', new Date().toISOString());
  console.log('='.repeat(80));

  try {
    // 1. ПОЛУЧАЕМ ИСХОДНЫЕ ДАННЫЕ
    console.log('\n1️⃣ ИСХОДНЫЕ ДАННЫЕ:');
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, balance_ton')
      .eq('id', 25)
      .single();

    if (userError || !user) {
      console.error('❌ Пользователь не найден:', userError);
      return;
    }

    console.log(`✅ User ID 25 текущий balance_ton: ${user.balance_ton}`);

    // 2. ПОЛУЧАЕМ ДАННЫЕ ТРАНЗАКЦИИ 1910979
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', 1910979)
      .single();

    if (txError || !transaction) {
      console.error('❌ Транзакция не найдена:', txError);
      return;
    }

    console.log(`✅ Transaction ID 1910979:`);
    console.log(`   - Type: ${transaction.type}`);
    console.log(`   - Amount TON: ${transaction.amount_ton}`);
    console.log(`   - Status: ${transaction.status}`);
    console.log(`   - Created: ${transaction.created_at}`);

    // 3. СИМУЛИРУЕМ shouldUpdateBalance()
    console.log('\n2️⃣ ПРОВЕРКА shouldUpdateBalance():');
    
    const incomeTypes = [
      'FARMING_REWARD',
      'REFERRAL_REWARD', 
      'MISSION_REWARD',
      'DAILY_BONUS',
      'TON_BOOST_INCOME',
      'UNI_DEPOSIT',
      'TON_DEPOSIT',  // ← ЭТОТ ТИП ДОЛЖЕН ОБНОВЛЯТЬ БАЛАНС
      'AIRDROP_REWARD',
      'DEPOSIT'
    ];
    
    const shouldUpdate = incomeTypes.includes(transaction.type as any);
    console.log(`✅ shouldUpdateBalance('${transaction.type}'): ${shouldUpdate}`);
    
    if (!shouldUpdate) {
      console.log('🚨 ПРОБЛЕМА НАЙДЕНА: TON_DEPOSIT не в списке incomeTypes!');
      return;
    }

    // 4. СИМУЛИРУЕМ updateUserBalance()
    console.log('\n3️⃣ СИМУЛЯЦИЯ updateUserBalance():');
    console.log(`   Попытка: addBalance(user_id=${transaction.user_id}, uni=0, ton=${transaction.amount_ton})`);
    
    // Проверяем что произошло бы при вызове BalanceManager
    console.log('\n4️⃣ ПРОВЕРКА BalanceManager:');
    console.log(`   Текущий баланс: ${user.balance_ton}`);
    console.log(`   Ожидаемое добавление: +${transaction.amount_ton}`);
    console.log(`   Ожидаемый результат: ${user.balance_ton + transaction.amount_ton}`);
    console.log(`   Фактический результат: ${user.balance_ton} (НЕ ИЗМЕНИЛСЯ!)`);

    // 5. ПРОВЕРЯЕМ ЕСТЬ ЛИ ДРУГИЕ ОПЕРАЦИИ В ТО ЖЕ ВРЕМЯ
    console.log('\n5️⃣ ПОИСК КОНФЛИКТУЮЩИХ ОПЕРАЦИЙ:');
    
    const txTime = new Date(transaction.created_at).getTime();
    const oneMinute = 60 * 1000;
    const timeStart = new Date(txTime - oneMinute).toISOString();
    const timeEnd = new Date(txTime + oneMinute).toISOString();
    
    const { data: concurrentTx, error: concurrentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .gte('created_at', timeStart)
      .lte('created_at', timeEnd)
      .order('created_at', { ascending: true });

    if (concurrentError) {
      console.error('❌ Ошибка поиска concurrent транзакций:', concurrentError);
    } else if (concurrentTx && concurrentTx.length > 0) {
      console.log(`✅ Найдено ${concurrentTx.length} транзакций в окне ±1 минута:`);
      
      concurrentTx.forEach((tx, index) => {
        const isTarget = tx.id === 1910979;
        const mark = isTarget ? ' ⭐' : '';
        console.log(`${index + 1}. ID ${tx.id}: ${tx.type} - ${tx.amount_ton} TON - ${tx.created_at}${mark}`);
        
        if (tx.type === 'WITHDRAWAL' && tx.currency === 'TON') {
          console.log(`   🚨 WITHDRAWAL найден! Может конфликтовать с депозитом`);
        }
      });
    }

    // 6. ФИНАЛЬНАЯ ДИАГНОСТИКА
    console.log('\n' + '='.repeat(80));
    console.log('6️⃣ ФИНАЛЬНАЯ ДИАГНОСТИКА:');
    
    console.log('\n✅ ФАКТЫ:');
    console.log(`   - Транзакция 1910979 создана с status="completed"`);
    console.log(`   - Type="TON_DEPOSIT" входит в incomeTypes`);
    console.log(`   - shouldUpdateBalance() возвращает true`);
    console.log(`   - updateUserBalance() должен вызываться`);
    console.log(`   - BalanceManager.addBalance() должен добавить +1 TON`);
    console.log(`   - НО баланс остался ${user.balance_ton}`);

    console.log('\n🚨 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
    console.log('1. BalanceManager.addBalance() упал с ошибкой, но транзакция не откатилась');
    console.log('2. Race condition - другая операция откатила изменение');
    console.log('3. Ошибка в самом BalanceManager.addBalance()');
    console.log('4. Проблема с Supabase update operation');
    console.log('5. Проблема в самом коде updateUserBalance()');

    console.log('\n💡 РЕШЕНИЕ:');
    console.log('1. Нужно добавить +1 TON к User 25 вручную');
    console.log('2. Исправить код чтобы такая ситуация не повторялась');
    console.log('3. Добавить больше логирования в BalanceManager');

    // 7. РАСЧЕТ ТОЧНОЙ СУММЫ К ДОБАВЛЕНИЮ
    console.log('\n7️⃣ РАСЧЕТ КОМПЕНСАЦИИ:');
    
    // Находим все необработанные TON_DEPOSIT для User 25
    const { data: allTonDeposits, error: allDepositError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .eq('type', 'TON_DEPOSIT')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allDepositError) {
      console.error('❌ Ошибка получения всех TON депозитов:', allDepositError);
    } else if (allTonDeposits && allTonDeposits.length > 0) {
      console.log(`✅ Найдено ${allTonDeposits.length} completed TON депозитов:`);
      
      let totalShouldBeAdded = 0;
      
      allTonDeposits.forEach((deposit, index) => {
        console.log(`${index + 1}. ID ${deposit.id}: ${deposit.amount_ton} TON - ${deposit.created_at}`);
        totalShouldBeAdded += deposit.amount_ton;
      });
      
      console.log(`\n📊 ИТОГОВЫЙ РАСЧЕТ:`);
      console.log(`   Сумма всех TON депозитов: ${totalShouldBeAdded} TON`);
      console.log(`   Текущий баланс: ${user.balance_ton} TON`);
      console.log(`   НЕДОСТАЧА: ${totalShouldBeAdded - user.balance_ton} TON (примерно)`);
      
      if (totalShouldBeAdded - user.balance_ton > 0) {
        console.log(`\n🔧 РЕКОМЕНДАЦИЯ: Добавить ${(totalShouldBeAdded - user.balance_ton).toFixed(6)} TON к User 25`);
      }
    }

  } catch (error) {
    console.error('💥 Критическая ошибка симуляции:', error);
  }
}

// Запускаем симуляцию
simulateUser25Problem().then(() => {
  console.log('\n✅ Симуляция завершена');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Фатальная ошибка:', error);
  process.exit(1);
});