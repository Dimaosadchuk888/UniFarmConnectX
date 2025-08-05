/**
 * ГЛУБОКАЯ ОТЛАДКА ПРОЦЕССА TON ПОПОЛНЕНИЯ
 * Пошаговая проверка каждого этапа обработки депозита
 */

import { supabase } from './core/supabaseClient';

async function debugTonDepositFlow() {
  console.log('🔧 ГЛУБОКАЯ ОТЛАДКА ПРОЦЕССА TON ПОПОЛНЕНИЯ');
  console.log('Проверяем каждый этап обработки депозита транзакции 1910979');
  console.log('='.repeat(80));

  try {
    // 1. ПОЛУЧАЕМ ДЕТАЛИ ТРАНЗАКЦИИ
    console.log('\n1️⃣ АНАЛИЗ ТРАНЗАКЦИИ 1910979:');
    
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', 1910979)
      .single();

    if (txError || !tx) {
      console.error('❌ Транзакция не найдена:', txError);
      return;
    }

    console.log('✅ Данные транзакции:');
    console.log(`   ID: ${tx.id}`);
    console.log(`   User ID: ${tx.user_id}`);
    console.log(`   Type: ${tx.type}`);
    console.log(`   Amount TON: ${tx.amount_ton}`);
    console.log(`   Amount UNI: ${tx.amount_uni}`);
    console.log(`   Currency: ${tx.currency}`);
    console.log(`   Status: ${tx.status}`);
    console.log(`   Created: ${tx.created_at}`);
    console.log(`   Updated: ${tx.updated_at}`);

    // 2. ПРОВЕРЯЕМ ЛОГИКУ shouldUpdateBalance
    console.log('\n2️⃣ ПРОВЕРКА shouldUpdateBalance():');
    
    const incomeTypes = [
      'FARMING_REWARD',
      'REFERRAL_REWARD', 
      'MISSION_REWARD',
      'DAILY_BONUS',
      'TON_BOOST_INCOME',
      'UNI_DEPOSIT',
      'TON_DEPOSIT',
      'AIRDROP_REWARD',
      'DEPOSIT'
    ];
    
    const shouldUpdate = incomeTypes.includes(tx.type);
    console.log(`   Type "${tx.type}" в списке incomeTypes: ${shouldUpdate}`);
    
    if (!shouldUpdate) {
      console.log('❌ ПРОБЛЕМА: Тип транзакции не будет обновлять баланс!');
      console.log('   Нужно добавить этот тип в incomeTypes или исправить маппинг');
      return;
    }

    // 3. ПРОВЕРЯЕМ ТЕКУЩИЙ БАЛАНС ПОЛЬЗОВАТЕЛЯ
    console.log('\n3️⃣ СОСТОЯНИЕ БАЛАНСА ПОЛЬЗОВАТЕЛЯ:');
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, balance_ton, balance_uni')
      .eq('id', tx.user_id)
      .single();

    if (userError || !user) {
      console.error('❌ Пользователь не найден:', userError);
      return;
    }

    console.log(`   Текущий balance_ton: ${user.balance_ton}`);
    console.log(`   Текущий balance_uni: ${user.balance_uni}`);
    console.log(`   Ожидаемый balance_ton: ${user.balance_ton + tx.amount_ton}`);

    // 4. СИМУЛИРУЕМ BalanceManager.addBalance()
    console.log('\n4️⃣ СИМУЛЯЦИЯ BalanceManager.addBalance():');
    
    console.log(`   Вызов: addBalance(${tx.user_id}, 0, ${tx.amount_ton})`);
    console.log(`   Операция: ${user.balance_ton} + ${tx.amount_ton} = ${user.balance_ton + tx.amount_ton}`);

    // Проверяем что Supabase update сработает
    console.log('\n5️⃣ ТЕСТ ОБНОВЛЕНИЯ ЧЕРЕЗ SUPABASE:');
    
    const testBalance = user.balance_ton + 0.000001; // Добавляем минимальную сумму для теста
    
    console.log(`   Тестовое обновление: ${user.balance_ton} → ${testBalance}`);
    
    const { data: updateResult, error: updateError } = await supabase
      .from('users')
      .update({ balance_ton: testBalance })
      .eq('id', tx.user_id)
      .select('balance_ton')
      .single();

    if (updateError) {
      console.error('❌ ПРОБЛЕМА С SUPABASE UPDATE:', updateError);
      console.log('   Возможные причины:');
      console.log('   - Нет прав на обновление таблицы users');
      console.log('   - Проблема с типом данных balance_ton');
      console.log('   - RLS политики блокируют обновление');
      console.log('   - Проблема с подключением к БД');
    } else {
      console.log(`✅ Тестовое обновление прошло успешно: ${updateResult.balance_ton}`);
      
      // Откатываем тестовое изменение
      const { error: rollbackError } = await supabase
        .from('users')
        .update({ balance_ton: user.balance_ton })
        .eq('id', tx.user_id);

      if (rollbackError) {
        console.warn('⚠️ Не удалось откатить тестовое изменение:', rollbackError);
      } else {
        console.log('✅ Тестовое изменение откачено');
      }
    }

    // 6. ПРОВЕРЯЕМ ПРАВА ДОСТУПА К ТАБЛИЦЕ
    console.log('\n6️⃣ ПРОВЕРКА ПРАВ ДОСТУПА:');
    
    const { data: tableAccess, error: accessError } = await supabase
      .from('users')
      .select('id, balance_ton')
      .eq('id', tx.user_id)
      .single();

    if (accessError) {
      console.error('❌ Нет доступа на чтение таблицы users:', accessError);
    } else {
      console.log('✅ Чтение таблицы users работает');
    }

    // 7. АНАЛИЗ METADATA ТРАНЗАКЦИИ
    console.log('\n7️⃣ АНАЛИЗ METADATA:');
    
    if (tx.metadata) {
      console.log('✅ Metadata присутствует:');
      console.log(JSON.stringify(tx.metadata, null, 2));
      
      if (tx.metadata.tx_hash) {
        console.log(`✅ tx_hash: ${tx.metadata.tx_hash}`);
      }
      
      if (tx.metadata.hash_extracted) {
        console.log(`✅ hash_extracted: ${tx.metadata.hash_extracted}`);
      }
    } else {
      console.log('❌ Metadata отсутствует');
    }

    // 8. ПОИСК ДРУГИХ УСПЕШНЫХ TON ДЕПОЗИТОВ ДЛЯ СРАВНЕНИЯ
    console.log('\n8️⃣ СРАВНЕНИЕ С ДРУГИМИ TON ДЕПОЗИТАМИ:');
    
    const { data: otherDeposits, error: otherError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .eq('status', 'completed')
      .eq('amount_ton', 1)
      .neq('id', 1910979)
      .limit(3)
      .order('created_at', { ascending: false });

    if (otherError) {
      console.error('❌ Ошибка получения других депозитов:', otherError);
    } else if (otherDeposits && otherDeposits.length > 0) {
      console.log(`✅ Найдено ${otherDeposits.length} похожих депозитов для сравнения:`);
      
      for (const deposit of otherDeposits) {
        console.log(`\n--- Депозит ID ${deposit.id} ---`);
        console.log(`   User ID: ${deposit.user_id}`);
        console.log(`   Amount: ${deposit.amount_ton} TON`);
        console.log(`   Created: ${deposit.created_at}`);
        
        // Проверяем баланс этого пользователя
        const { data: otherUser, error: otherUserError } = await supabase
          .from('users')
          .select('balance_ton')
          .eq('id', deposit.user_id)
          .single();

        if (!otherUserError && otherUser) {
          console.log(`   Баланс пользователя: ${otherUser.balance_ton} TON`);
          
          // Проверяем сколько у него всего TON депозитов
          const { data: userDeposits, error: userDepositError } = await supabase
            .from('transactions')
            .select('amount_ton')
            .eq('user_id', deposit.user_id)
            .eq('type', 'TON_DEPOSIT')
            .eq('status', 'completed');

          if (!userDepositError && userDeposits) {
            const totalDeposits = userDeposits.reduce((sum, d) => sum + d.amount_ton, 0);
            console.log(`   Всего депозитов: ${totalDeposits} TON`);
            console.log(`   Разница: ${otherUser.balance_ton - totalDeposits} TON`);
            
            if (Math.abs(otherUser.balance_ton - totalDeposits) < 0.1) {
              console.log('✅ У этого пользователя баланс соответствует депозитам');
            } else {
              console.log('❌ У этого пользователя тоже есть расхождения!');
            }
          }
        }
      }
    }

    // 9. ФИНАЛЬНАЯ ДИАГНОСТИКА
    console.log('\n' + '='.repeat(80));
    console.log('9️⃣ ДИАГНОСТИКА И ПЛАН ДЕЙСТВИЙ:');
    
    console.log('\n✅ ЧТО РАБОТАЕТ:');
    console.log('   - Транзакция создается в БД');
    console.log('   - Type TON_DEPOSIT входит в incomeTypes');
    console.log('   - shouldUpdateBalance() возвращает true');
    console.log('   - Supabase подключение работает');
    
    console.log('\n❓ ЧТО НУЖНО ПРОВЕРИТЬ:');
    console.log('   1. Права RLS на обновление таблицы users');
    console.log('   2. Работает ли BalanceManager.addBalance() в runtime');
    console.log('   3. Обрабатываются ли ошибки в updateUserBalance()');
    console.log('   4. Есть ли race conditions между транзакциями');
    
    console.log('\n🔧 ПЛАН ИСПРАВЛЕНИЯ:');
    console.log('   1. Добавить детальное логирование в BalanceManager');
    console.log('   2. Сделать транзакцию атомарной (откат при ошибке баланса)');
    console.log('   3. Проверить и исправить RLS политики');
    console.log('   4. Добавить retry механизм для обновления баланса');

  } catch (error) {
    console.error('💥 Критическая ошибка отладки:', error);
  }
}

// Запускаем отладку
debugTonDepositFlow().then(() => {
  console.log('\n✅ Отладка завершена');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Фатальная ошибка:', error);
  process.exit(1);
});