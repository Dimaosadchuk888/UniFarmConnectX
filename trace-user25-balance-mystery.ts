/**
 * ГЛУБОКОЕ РАССЛЕДОВАНИЕ: Почему BalanceManager не обновил баланс User ID 25
 * Ищем точный момент, когда баланс должен был измениться
 */

import { supabase } from './core/supabaseClient';

async function traceUser25BalanceMystery() {
  console.log('🕵️ ТРАССИРОВКА ПРОПАВШЕГО БАЛАНСА USER ID 25');
  console.log('Время начала:', new Date().toISOString());
  console.log('='.repeat(80));

  try {
    // 1. ОПРЕДЕЛЯЕМ ТОЧНОЕ ВРЕМЯ ТРАНЗАКЦИИ 1910979
    console.log('\n1️⃣ ТОЧНОЕ ВРЕМЯ СОЗДАНИЯ ТРАНЗАКЦИИ 1910979:');
    const { data: targetTx, error: targetError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', 1910979)
      .single();

    if (targetError || !targetTx) {
      console.error('❌ Не удалось найти транзакцию 1910979:', targetError);
      return;
    }

    const txTime = new Date(targetTx.created_at).getTime();
    console.log(`✅ Транзакция 1910979 создана: ${targetTx.created_at}`);
    console.log(`   Время в миллисекундах: ${txTime}`);

    // 2. ПОИСК ВСЕХ ТРАНЗАКЦИЙ USER 25 ВОКРУГ ЭТОГО ВРЕМЕНИ (±5 минут)
    console.log('\n2️⃣ ВСЕ ТРАНЗАКЦИИ USER 25 ВОКРУГ ±5 МИНУТ:');
    const fiveMinutes = 5 * 60 * 1000;
    const timeStart = new Date(txTime - fiveMinutes).toISOString();
    const timeEnd = new Date(txTime + fiveMinutes).toISOString();

    const { data: aroundTx, error: aroundError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .gte('created_at', timeStart)
      .lte('created_at', timeEnd)
      .order('created_at', { ascending: true });

    if (aroundError) {
      console.error('❌ Ошибка поиска окружающих транзакций:', aroundError);
    } else if (aroundTx && aroundTx.length > 0) {
      console.log(`✅ Найдено ${aroundTx.length} транзакций в окне ±5 минут:`);
      
      let runningTonBalance = 4.96363; // Текущий баланс
      
      aroundTx.forEach((tx, index) => {
        const isTarget = tx.id === 1910979;
        const mark = isTarget ? ' ⭐ ЦЕЛЕВАЯ ТРАНЗАКЦИЯ' : '';
        
        console.log(`\n--- ${index + 1}. ${tx.created_at}${mark} ---`);
        console.log(`ID: ${tx.id}`);
        console.log(`Type: ${tx.type}`);
        console.log(`Amount TON: ${tx.amount_ton || 0}`);
        console.log(`Amount UNI: ${tx.amount_uni || 0}`);
        console.log(`Currency: ${tx.currency}`);
        console.log(`Status: ${tx.status}`);
        
        // СИМУЛЯЦИЯ ИЗМЕНЕНИЯ БАЛАНСА
        if (tx.status === 'completed') {
          if (tx.type === 'TON_DEPOSIT' && tx.amount_ton) {
            runningTonBalance += tx.amount_ton;
            console.log(`💰 Баланс должен стать: ${runningTonBalance.toFixed(6)} TON (+${tx.amount_ton})`);
          } else if (tx.type === 'WITHDRAWAL' && tx.currency === 'TON' && tx.amount_ton) {
            runningTonBalance -= tx.amount_ton;
            console.log(`💸 Баланс должен стать: ${runningTonBalance.toFixed(6)} TON (-${tx.amount_ton})`);
          } else if (tx.type?.includes('REWARD') && tx.currency === 'TON' && tx.amount_ton) {
            runningTonBalance += tx.amount_ton;
            console.log(`🎁 Баланс должен стать: ${runningTonBalance.toFixed(6)} TON (+${tx.amount_ton})`);
          }
        }
        
        if (isTarget) {
          console.log('🎯 ЭТА ТРАНЗАКЦИЯ ДОЛЖНА БЫЛА ДОБАВИТЬ +1 TON!');
          console.log(`   Ожидаемый баланс: ${runningTonBalance.toFixed(6)} TON`);
          console.log(`   Фактический баланс: 4.96363 TON`);
          console.log(`   РАЗНИЦА: ${(runningTonBalance - 4.96363).toFixed(6)} TON`);
        }
      });
      
      console.log(`\n📊 ИТОГОВЫЙ РАСЧЕТ:`);
      console.log(`   Ожидаемый баланс: ${runningTonBalance.toFixed(6)} TON`);
      console.log(`   Фактический баланс: 4.96363 TON`);
      console.log(`   ПРОПУСК: ${(runningTonBalance - 4.96363).toFixed(6)} TON`);
    }

    // 3. ПРОВЕРЯЕМ КОМПЕНСИРУЮЩИЕ ТРАНЗАКЦИИ
    console.log('\n3️⃣ ПОИСК КОМПЕНСИРУЮЩИХ ТРАНЗАКЦИЙ:');
    console.log('Ищем withdrawal/outgoing транзакции, которые могли "съесть" +1 TON...');
    
    const { data: withdrawals, error: withdrawError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .in('type', ['WITHDRAWAL', 'FARMING_DEPOSIT', 'BOOST_PURCHASE'])
      .eq('currency', 'TON')
      .gte('created_at', timeStart)
      .lte('created_at', timeEnd)
      .order('created_at', { ascending: true });

    if (withdrawError) {
      console.error('❌ Ошибка поиска withdrawals:', withdrawError);
    } else if (withdrawals && withdrawals.length > 0) {
      console.log(`🔍 Найдено ${withdrawals.length} исходящих TON транзакций:`);
      
      withdrawals.forEach((w, index) => {
        console.log(`${index + 1}. ID ${w.id}: ${w.type} - ${w.amount_ton} TON - ${w.created_at}`);
        
        if (w.amount_ton === 1) {
          console.log('   🚨 ПОДОЗРИТЕЛЬНО: Точно 1 TON как в депозите!');
        }
      });
    } else {
      console.log('✅ Компенсирующих транзакций не найдено');
    }

    // 4. ПРОВЕРЯЕМ ДРУГИЕ ПОЛЬЗОВАТЕЛИ - БЫЛА ЛИ ОШИБКА В USER_ID
    console.log('\n4️⃣ ПРОВЕРКА ОШИБКИ USER_ID:');
    console.log('Ищем TON_DEPOSIT на 1 TON в то же время для других пользователей...');
    
    const { data: otherDeposits, error: otherError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .eq('amount_ton', 1)
      .eq('status', 'completed')
      .gte('created_at', timeStart)
      .lte('created_at', timeEnd)
      .neq('user_id', 25)
      .order('created_at', { ascending: true });

    if (otherError) {
      console.error('❌ Ошибка поиска депозитов других пользователей:', otherError);
    } else if (otherDeposits && otherDeposits.length > 0) {
      console.log(`🔍 Найдено ${otherDeposits.length} депозитов 1 TON у других пользователей:`);
      
      otherDeposits.forEach((d, index) => {
        console.log(`${index + 1}. User ${d.user_id}: ID ${d.id} - ${d.created_at}`);
        
        // Сравниваем tx_hash или wallet_address
        if (d.metadata?.tx_hash === targetTx.metadata?.tx_hash) {
          console.log('   🚨 ДУБЛИКАТ: Тот же tx_hash!');
        }
        if (d.metadata?.wallet_address === targetTx.metadata?.wallet_address) {
          console.log('   🚨 ДУБЛИКАТ: Тот же wallet_address!');
        }
      });
    } else {
      console.log('✅ Дублирующих депозитов не найдено');
    }

    // 5. ПРОВЕРЯЕМ ИСТОРИЮ ИЗМЕНЕНИЯ БАЛАНСА ЧЕРЕЗ AUDIT/LOGS
    console.log('\n5️⃣ ПОИСК ЛОГОВ ОБНОВЛЕНИЯ БАЛАНСА:');
    
    try {
      const { data: logs, error: logsError } = await supabase
        .from('logs')
        .select('*')
        .or(`message.ilike.%user%25%,message.ilike.%1910979%,message.ilike.%BalanceManager%`)
        .gte('created_at', timeStart)
        .lte('created_at', timeEnd)
        .order('created_at', { ascending: true })
        .limit(20);

      if (logsError) {
        console.log('ℹ️ Таблица logs недоступна или пуста');
      } else if (logs && logs.length > 0) {
        console.log(`✅ Найдено ${logs.length} релевантных логов:`);
        
        logs.forEach((log, index) => {
          console.log(`\n--- Лог ${index + 1} (${log.created_at}) ---`);
          console.log(`Level: ${log.level}`);
          console.log(`Message: ${log.message}`);
          
          if (log.message.includes('1910979')) {
            console.log('🎯 НАЙДЕН ЛОГ О НАШЕЙ ТРАНЗАКЦИИ!');
          }
          if (log.message.includes('BalanceManager') && log.message.includes('25')) {
            console.log('💰 НАЙДЕН ЛОГ ОБ ОБНОВЛЕНИИ БАЛАНСА USER 25!');
          }
        });
      } else {
        console.log('ℹ️ Релевантных логов не найдено');
      }
    } catch (error) {
      console.log('ℹ️ Проверка логов пропущена (таблица недоступна)');
    }

    // 6. ФИНАЛЬНАЯ ДИАГНОСТИКА
    console.log('\n' + '='.repeat(80));
    console.log('6️⃣ ФИНАЛЬНАЯ ДИАГНОСТИКА ПРОБЛЕМЫ:');
    
    console.log('\n🔍 ФАКТЫ:');
    console.log(`✅ Транзакция 1910979 существует и имеет status="completed"`);
    console.log(`✅ Amount = 1 TON, currency = TON`);
    console.log(`✅ Поле balance_ton существует в БД`);
    console.log(`✅ Hash извлечен из BOC (hash_extracted: true)`);
    console.log(`❌ balance_ton остался 4.96363 вместо 5.96363`);
    
    console.log('\n🚨 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
    console.log('1. BalanceManager не вызывался для транзакции 1910979');
    console.log('2. BalanceManager вызывался, но завершился с ошибкой');
    console.log('3. BalanceManager обновил баланс, но другая операция его откатила');
    console.log('4. UnifiedTransactionService создал транзакцию без вызова BalanceManager');
    console.log('5. Race condition между транзакциями');
    
    console.log('\n💡 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('1. Проверить backend logs во время 05:09:52');
    console.log('2. Найти вызовы BalanceManager для User 25');
    console.log('3. Проверить код UnifiedTransactionService на предмет пропуска updateBalance');
    console.log('4. Временно добавить +1 TON вручную для User 25');

  } catch (error) {
    console.error('💥 Критическая ошибка трассировки:', error);
  }
}

// Запускаем трассировку
traceUser25BalanceMystery().then(() => {
  console.log('\n✅ Трассировка завершена');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Фатальная ошибка:', error);
  process.exit(1);
});