#!/usr/bin/env tsx
/**
 * МОНИТОРИНГ ИСПРАВЛЕННОГО ПЛАНИРОВЩИКА TON BOOST
 * Проверяет что User 287 и остальные пользователи получают доходы после исправления
 */

import { supabase } from '../core/supabase';

async function monitorSchedulerFix() {
  console.log('🔍 МОНИТОРИНГ ИСПРАВЛЕННОГО ПЛАНИРОВЩИКА TON BOOST');
  console.log('===============================================');
  console.log(`Время: ${new Date().toLocaleString('ru-RU')}\n`);

  // 1. Проверяем последние транзакции TON Boost пользователей
  console.log('1. 📊 ПОСЛЕДНИЕ НАЧИСЛЕНИЯ TON BOOST:');
  
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recentTonIncomes } = await supabase
    .from('transactions')
    .select('user_id, created_at, amount_ton, description')
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false });

  if (recentTonIncomes && recentTonIncomes.length > 0) {
    console.log(`   Новых начислений TON за 5 минут: ${recentTonIncomes.length}`);
    
    const uniqueUsers = [...new Set(recentTonIncomes.map(tx => tx.user_id))];
    console.log(`   Пользователей получило доходы: ${uniqueUsers.length}`);
    
    console.log('\n   Детали последних начислений:');
    recentTonIncomes.slice(0, 5).forEach(tx => {
      const time = new Date(tx.created_at).toLocaleTimeString('ru-RU');
      console.log(`   • User ${tx.user_id}: +${parseFloat(tx.amount_ton).toFixed(6)} TON (${time})`);
    });
    
    // Проверяем User 287 специально
    const user287Income = recentTonIncomes.find(tx => tx.user_id === 287);
    if (user287Income) {
      const time = new Date(user287Income.created_at).toLocaleTimeString('ru-RU');
      console.log(`\n   ✅ USER 287 ПОЛУЧИЛ ДОХОД: +${parseFloat(user287Income.amount_ton).toFixed(6)} TON (${time})`);
      console.log('   🎉 ИСПРАВЛЕНИЕ ПЛАНИРОВЩИКА РАБОТАЕТ!');
    } else {
      console.log('\n   ⏳ User 287 еще не получил доход - ожидаем следующий цикл планировщика');
    }
  } else {
    console.log('   Новых начислений TON пока нет - проверим через 5 минут');
  }

  // 2. Проверяем статус всех 8 проблемных пользователей
  console.log('\n2. 👥 СТАТУС ВСЕХ 8 ПОЛЬЗОВАТЕЛЕЙ:');
  
  const problemUsers = [25, 186, 187, 188, 189, 190, 224, 287];
  
  for (const userId of problemUsers) {
    const { data: lastIncome } = await supabase
      .from('transactions')
      .select('created_at, amount_ton')
      .eq('user_id', userId)
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(1);

    if (lastIncome && lastIncome.length > 0) {
      const minutesAgo = Math.round((Date.now() - new Date(lastIncome[0].created_at).getTime()) / (1000 * 60));
      const amount = parseFloat(lastIncome[0].amount_ton).toFixed(6);
      console.log(`   User ${userId}: Последний доход ${minutesAgo} мин назад (+${amount} TON)`);
    } else {
      console.log(`   User ${userId}: Доходов пока нет - ожидаем планировщик`);
    }
  }

  // 3. Проверяем активность планировщика
  console.log('\n3. ⚙️ АКТИВНОСТЬ ПЛАНИРОВЩИКА:');
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: allTonIncomes } = await supabase
    .from('transactions')
    .select('created_at')
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .gte('created_at', oneHourAgo);

  if (allTonIncomes && allTonIncomes.length > 0) {
    // Группируем по 5-минутным интервалам
    const intervals = new Map();
    allTonIncomes.forEach(tx => {
      const time = new Date(tx.created_at);
      const interval = new Date(time.getFullYear(), time.getMonth(), time.getDate(), time.getHours(), Math.floor(time.getMinutes() / 5) * 5);
      const key = interval.toISOString();
      intervals.set(key, (intervals.get(key) || 0) + 1);
    });

    const sortedIntervals = Array.from(intervals.entries()).sort().reverse().slice(0, 6);
    console.log('   Активность планировщика (последние 30 минут):');
    sortedIntervals.forEach(([interval, count]) => {
      const time = new Date(interval).toLocaleTimeString('ru-RU');
      console.log(`   • ${time}: ${count} начислений`);
    });
  } else {
    console.log('   Планировщик не активен последний час');
  }

  // 4. Состояние farming_data пользователей
  console.log('\n4. 📋 СОСТОЯНИЕ FARMING DATA:');
  
  const { data: farmingData } = await supabase
    .from('ton_farming_data')
    .select('user_id, farming_balance, farming_rate, boost_package_id, boost_active')
    .eq('boost_active', true);

  if (farmingData) {
    console.log(`   Активных пользователей в farming_data: ${farmingData.length}`);
    farmingData.forEach(user => {
      const balance = parseFloat(user.farming_balance || '0').toFixed(3);
      const rate = parseFloat(user.farming_rate || '0').toFixed(3);
      console.log(`   • User ${user.user_id}: ${balance} TON депозит, пакет ${user.boost_package_id}, rate ${rate}`);
    });
  }

  // 5. Рекомендации
  console.log('\n5. 📝 РЕКОМЕНДАЦИИ:');
  console.log('═'.repeat(40));
  
  if (recentTonIncomes && recentTonIncomes.length > 0) {
    console.log('✅ Планировщик работает - пользователи получают доходы');
    
    if (recentTonIncomes.find(tx => tx.user_id === 287)) {
      console.log('✅ User 287 получает доходы - проблема полностью решена!');
    } else {
      console.log('⏳ User 287 скоро получит доход в следующем цикле');
    }
  } else {
    console.log('⏳ Ожидаем следующий цикл планировщика (каждые 5 минут)');
    console.log('💡 Следующая проверка рекомендуется через 5-10 минут');
  }

  console.log('\n✅ Мониторинг исправления завершен');
}

// Запуск
monitorSchedulerFix()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка мониторинга:', error);
    process.exit(1);
  });