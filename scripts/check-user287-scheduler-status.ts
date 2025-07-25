#!/usr/bin/env tsx
/**
 * Дополнительная диагностика планировщика для User ID 287
 * Проверка причин остановки начислений
 */

import { supabase } from '../core/supabase';

async function checkUser287SchedulerStatus() {
  console.log('🔍 ДИАГНОСТИКА ПЛАНИРОВЩИКА - USER ID 287');
  console.log('==========================================\n');

  const userId = 287;

  // 1. Текущее состояние пользователя
  console.log('1. 📊 ТЕКУЩЕЕ СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ:');
  const { data: userState } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userState) {
    console.log(`   • ID: ${userState.id}`);
    console.log(`   • Username: ${userState.username || 'N/A'}`);
    console.log(`   • Баланс TON: ${userState.balance_ton || 0}`);
    console.log(`   • TON Boost Package: ${userState.ton_boost_package || 'НЕТ'}`);
    console.log(`   • TON Boost Package ID: ${userState.ton_boost_package_id || 'НЕТ'}`);
    console.log(`   • TON Boost Rate: ${userState.ton_boost_rate || 'НЕТ'}`);
    console.log(`   • TON Boost Start: ${userState.ton_boost_start_timestamp || 'НЕТ'}`);
  }

  // 2. Состояние в ton_farming_data
  console.log('\n2. 🗃️ СОСТОЯНИЕ В TON_FARMING_DATA:');
  const { data: farmingData } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId);

  if (farmingData && farmingData.length > 0) {
    farmingData.forEach((data, index) => {
      console.log(`   Запись ${index + 1}:`);
      console.log(`   • Package ID: ${data.boost_package_id}`);
      console.log(`   • Активен: ${data.boost_active ? 'ДА' : 'НЕТ'}`);
      console.log(`   • Баланс фарминга: ${data.farming_balance}`);
      console.log(`   • Ставка: ${data.farming_rate}`);
      console.log(`   • Дата начала: ${data.start_date}`);
      console.log(`   • Дата окончания: ${data.end_date}`);
      
      // Проверим, не истек ли срок
      if (data.end_date) {
        const endDate = new Date(data.end_date);
        const now = new Date();
        const isExpired = now > endDate;
        const timeLeft = endDate.getTime() - now.getTime();
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        
        console.log(`   • Статус срока: ${isExpired ? '❌ ИСТЕК' : '✅ АКТИВЕН'}`);
        if (!isExpired) {
          console.log(`   • Осталось часов: ${hoursLeft}`);
        }
      }
      console.log('');
    });
  } else {
    console.log('   ❌ Записи в ton_farming_data не найдены');
  }

  // 3. Последние транзакции планировщика
  console.log('3. 📜 ИСТОРИЯ ТРАНЗАКЦИЙ ПЛАНИРОВЩИКА:');
  const { data: schedulerTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .order('created_at', { ascending: false })
    .limit(10);

  if (schedulerTx && schedulerTx.length > 0) {
    console.log(`   Найдено ${schedulerTx.length} транзакций от планировщика:`);
    schedulerTx.forEach((tx, index) => {
      console.log(`   ${index + 1}. [${tx.created_at}]`);
      console.log(`      Сумма: ${tx.amount_ton} TON`);
      console.log(`      Описание: ${tx.description}`);
      if (tx.metadata?.transaction_source) {
        console.log(`      Источник: ${tx.metadata.transaction_source}`);
      }
      if (tx.metadata?.original_type) {
        console.log(`      Тип: ${tx.metadata.original_type}`);
      }
    });

    // Анализ частоты
    if (schedulerTx.length >= 2) {
      const intervals = [];
      for (let i = 0; i < schedulerTx.length - 1; i++) {
        const time1 = new Date(schedulerTx[i].created_at);
        const time2 = new Date(schedulerTx[i + 1].created_at);
        const intervalMin = (time1.getTime() - time2.getTime()) / (1000 * 60);
        intervals.push(intervalMin);
      }
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      console.log(`\n   📊 Средний интервал между начислениями: ${avgInterval.toFixed(1)} минут`);
      
      const lastTxTime = new Date(schedulerTx[0].created_at);
      const timeSinceLast = (Date.now() - lastTxTime.getTime()) / (1000 * 60);
      console.log(`   ⏱️ Время с последнего начисления: ${timeSinceLast.toFixed(1)} минут`);
      
      if (timeSinceLast > avgInterval * 3) {
        console.log('   ⚠️ ПЛАНИРОВЩИК ВЕРОЯТНО ОСТАНОВЛЕН (превышен средний интервал в 3 раза)');
      }
    }
  } else {
    console.log('   ❌ Транзакции от планировщика не найдены');
  }

  // 4. Глобальная активность планировщика
  console.log('\n4. 🌐 ГЛОБАЛЬНАЯ АКТИВНОСТЬ ПЛАНИРОВЩИКА:');
  const { data: globalActivity } = await supabase
    .from('transactions')
    .select('user_id, created_at, amount_ton')
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  if (globalActivity && globalActivity.length > 0) {
    console.log(`   ✅ Планировщик активен глобально (${globalActivity.length} начислений за 15 минут):`);
    globalActivity.forEach(tx => {
      console.log(`   • User ${tx.user_id}: ${tx.amount_ton} TON [${tx.created_at}]`);
    });
    
    const hasUser287 = globalActivity.some(tx => tx.user_id === 287);
    if (!hasUser287) {
      console.log('\n   ❌ ПРОБЛЕМА: User 287 НЕ получает начисления, хотя планировщик работает для других');
    }
  } else {
    console.log('   ❌ ПЛАНИРОВЩИК НЕ РАБОТАЕТ ГЛОБАЛЬНО (нет начислений за 15 минут)');
  }

  // 5. Проверка активных TON Boost пользователей
  console.log('\n5. 👥 ДРУГИЕ АКТИВНЫЕ TON BOOST ПОЛЬЗОВАТЕЛИ:');
  const { data: activeUsers } = await supabase
    .from('ton_farming_data')
    .select('user_id, boost_package_id, farming_balance, boost_active')
    .eq('boost_active', true)
    .gt('farming_balance', 0);

  if (activeUsers && activeUsers.length > 0) {
    console.log(`   Найдено ${activeUsers.length} активных пользователей:`);
    activeUsers.forEach(user => {
      console.log(`   • User ${user.user_id}: Package ${user.boost_package_id}, Balance ${user.farming_balance} TON`);
    });
    
    const user287Active = activeUsers.find(u => u.user_id === 287);
    if (user287Active) {
      console.log('\n   ✅ User 287 числится в активных пользователях');
      console.log(`      Баланс фарминга: ${user287Active.farming_balance} TON`);
      
      if (parseFloat(user287Active.farming_balance) <= 0) {
        console.log('   ❌ ПРОБЛЕМА: Нулевой баланс фарминга - планировщик не будет начислять');
      }
    } else {
      console.log('\n   ❌ ПРОБЛЕМА: User 287 НЕ числится в активных пользователях');
    }
  } else {
    console.log('   ❌ Активные пользователи не найдены');
  }

  // 6. Итоговые выводы
  console.log('\n6. 🎯 ИТОГОВЫЕ ВЫВОДЫ:');
  console.log('══════════════════════');
  
  if (userState?.ton_boost_package && farmingData?.length > 0) {
    const farmingRecord = farmingData[0];
    const hasValidBalance = parseFloat(farmingRecord.farming_balance || '0') > 0;
    const isActive = farmingRecord.boost_active;
    
    if (!isActive) {
      console.log('❌ ПРИЧИНА ОСТАНОВКИ: Boost пакет неактивен в ton_farming_data');
    } else if (!hasValidBalance) {
      console.log('❌ ПРИЧИНА ОСТАНОВКИ: Нулевой баланс фарминга в ton_farming_data');
    } else if (farmingRecord.end_date && new Date(farmingRecord.end_date) < new Date()) {
      console.log('❌ ПРИЧИНА ОСТАНОВКИ: Истек срок действия Boost пакета');
    } else {
      console.log('⚠️ НЕЯСНАЯ ПРИЧИНА: Все условия выполнены, но начислений нет');
      console.log('   Требуется проверка логики планировщика');
    }
  } else {
    console.log('❌ ПРИЧИНА ОСТАНОВКИ: Отсутствуют базовые записи о Boost пакете');
  }

  console.log('\n✅ Диагностика завершена');
}

// Запуск
checkUser287SchedulerStatus()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });