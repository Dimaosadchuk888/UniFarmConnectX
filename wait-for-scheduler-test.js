/**
 * МОНИТОРИНГ ПЛАНИРОВЩИКА В РЕАЛЬНОМ ВРЕМЕНИ
 * Ожидание следующего начисления TON Boost для подтверждения работы
 */

import { createClient } from '@supabase/supabase-js';

async function waitForSchedulerTest() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('⏰ МОНИТОРИНГ ПЛАНИРОВЩИКА TON BOOST В РЕАЛЬНОМ ВРЕМЕНИ');
  console.log('='.repeat(65));
  
  const userId = 48;
  let checkCount = 0;
  const maxChecks = 12; // 12 проверок = 60 минут (каждые 5 минут)
  
  // Получаем базовое состояние
  console.log('\n📊 БАЗОВОЕ СОСТОЯНИЕ:');
  
  const { data: initialUser, error: userError } = await supabase
    .from('users')
    .select('balance_ton, ton_boost_package, ton_boost_rate')
    .eq('id', userId)
    .single();
  
  if (userError) {
    console.log('❌ Ошибка получения пользователя:', userError.message);
    return;
  }
  
  console.log(`   • Баланс: ${initialUser.balance_ton} TON`);
  console.log(`   • Пакет: ${initialUser.ton_boost_package}`);
  console.log(`   • Ставка: ${(initialUser.ton_boost_rate * 100).toFixed(1)}%`);
  
  // Расчет ожидаемого дохода
  const deposit = Math.max(0, parseFloat(initialUser.balance_ton) - 10);
  const expectedIncome = (deposit * initialUser.ton_boost_rate) / 288;
  console.log(`   • Ожидаемый доход за 5 мин: ${expectedIncome.toFixed(8)} TON`);
  
  // Получаем последнюю транзакцию TON Boost для отслеживания
  const { data: lastTransaction, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .not('amount_ton', 'is', null)
    .neq('amount_ton', '0')
    .ilike('description', '%boost%')
    .order('created_at', { ascending: false })
    .limit(1);
  
  let lastTransactionId = 0;
  if (!txError && lastTransaction?.length > 0) {
    lastTransactionId = lastTransaction[0].id;
    const lastTime = new Date(lastTransaction[0].created_at);
    const minutesAgo = (new Date() - lastTime) / (1000 * 60);
    
    console.log(`   • Последняя TON Boost транзакция: ID ${lastTransactionId}`);
    console.log(`   • Время последней: ${minutesAgo.toFixed(1)} минут назад`);
    console.log(`   • Сумма последней: ${lastTransaction[0].amount_ton} TON`);
  } else {
    console.log('   • Последних TON Boost транзакций не найдено');
  }
  
  console.log('\n⏰ НАЧИНАЮ МОНИТОРИНГ (проверка каждые 5 минут):');
  console.log('   💡 Ожидаю появления новых транзакций TON Boost...');
  
  const startTime = new Date();
  
  while (checkCount < maxChecks) {
    checkCount++;
    const currentTime = new Date();
    const elapsed = Math.round((currentTime - startTime) / (1000 * 60));
    
    console.log(`\n🔍 Проверка ${checkCount}/${maxChecks} (прошло ${elapsed} мин):`);
    
    // Проверяем новые транзакции
    const { data: newTransactions, error: newTxError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .not('amount_ton', 'is', null)
      .neq('amount_ton', '0')
      .ilike('description', '%boost%')
      .gt('id', lastTransactionId)
      .order('created_at', { ascending: false });
    
    if (newTxError) {
      console.log(`   ❌ Ошибка проверки транзакций: ${newTxError.message}`);
    } else if (newTransactions?.length > 0) {
      console.log(`   🎉 НАЙДЕНО ${newTransactions.length} НОВЫХ ТРАНЗАКЦИЙ!`);
      
      newTransactions.forEach((tx, idx) => {
        const time = new Date(tx.created_at).toLocaleString('ru-RU');
        console.log(`     ${idx + 1}. ID: ${tx.id} | ${tx.amount_ton} TON | ${time}`);
        console.log(`        ${tx.description}`);
      });
      
      // Проверяем текущий баланс
      const { data: currentUser, error: balanceError } = await supabase
        .from('users')
        .select('balance_ton')
        .eq('id', userId)
        .single();
      
      if (!balanceError) {
        const balanceChange = parseFloat(currentUser.balance_ton) - parseFloat(initialUser.balance_ton);
        console.log(`   📈 Изменение баланса: ${initialUser.balance_ton} → ${currentUser.balance_ton} TON`);
        console.log(`   💰 Общий доход: ${balanceChange.toFixed(8)} TON`);
        
        // Проверяем соответствие расчетам
        const transactionsIncome = newTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount_ton), 0);
        const deviation = Math.abs(balanceChange - transactionsIncome);
        
        if (deviation < 0.00000001) {
          console.log(`   ✅ Баланс и транзакции синхронизированы`);
        } else {
          console.log(`   ⚠️ Расхождение: баланс +${balanceChange.toFixed(8)}, транзакции +${transactionsIncome.toFixed(8)}`);
        }
      }
      
      // Обновляем последний ID для следующих проверок
      lastTransactionId = Math.max(...newTransactions.map(tx => tx.id));
      
      console.log(`\n   🎯 ПЛАНИРОВЩИК РАБОТАЕТ КОРРЕКТНО!`);
      console.log(`   ⏰ Время между проверками: ~5 минут`);
      console.log(`   📊 Мониторинг завершен успешно`);
      break;
      
    } else {
      console.log(`   ⏳ Новых транзакций нет, ожидаю...`);
      
      // Показываем время до следующей проверки
      const nextCheck = 5 - ((new Date() - startTime) / (1000 * 60)) % 5;
      console.log(`   ⏰ Следующая проверка через ~${nextCheck.toFixed(1)} мин`);
    }
    
    // Пауза 5 минут между проверками (300000 мс)
    if (checkCount < maxChecks) {
      console.log(`   💤 Ожидание 5 минут...`);
      await new Promise(resolve => setTimeout(resolve, 300000)); // 5 минут
    }
  }
  
  if (checkCount >= maxChecks) {
    console.log('\n❌ ТАЙМ-АУТ МОНИТОРИНГА');
    console.log('   • Планировщик не создал новых транзакций за 60 минут');
    console.log('   • Возможные причины:');
    console.log('     - Планировщик не запущен автоматически');
    console.log('     - Ошибка в логике планировщика');
    console.log('     - Проблемы с базой данных');
  }
  
  console.log('\n' + '='.repeat(65));
  console.log('⏰ МОНИТОРИНГ ЗАВЕРШЕН');
}

waitForSchedulerTest().catch(console.error);