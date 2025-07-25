#!/usr/bin/env tsx
/**
 * Финальная проверка статуса планировщика TON Boost
 * Подтверждение выводов диагностики
 */

import { supabase } from '../core/supabase';

async function finalSchedulerStatusCheck() {
  console.log('🔍 ФИНАЛЬНАЯ ПРОВЕРКА СТАТУСА ПЛАНИРОВЩИКА');
  console.log('==========================================');
  console.log(`Время проверки: ${new Date().toLocaleString('ru-RU')}\n`);

  // 1. Активность планировщика за последние 10 минут
  console.log('1. 📊 АКТИВНОСТЬ ПЛАНИРОВЩИКА (последние 10 минут):');
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  const { data: recentActivity } = await supabase
    .from('transactions')
    .select('user_id, created_at, amount_ton, description')
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .gte('created_at', tenMinutesAgo)
    .order('created_at', { ascending: false });

  if (recentActivity && recentActivity.length > 0) {
    console.log(`   ✅ Планировщик АКТИВЕН - ${recentActivity.length} начислений за 10 минут\n`);
    
    // Группировка по пользователям
    const userStats = new Map();
    recentActivity.forEach(tx => {
      const userId = tx.user_id;
      if (!userStats.has(userId)) {
        userStats.set(userId, { count: 0, total: 0, lastTime: tx.created_at });
      }
      const stats = userStats.get(userId);
      stats.count++;
      stats.total += parseFloat(tx.amount_ton);
      userStats.set(userId, stats);
    });

    console.log('   📋 Статистика по пользователям:');
    for (const [userId, stats] of userStats) {
      console.log(`   • User ${userId}: ${stats.count} начислений, ${stats.total.toFixed(6)} TON`);
      console.log(`     Последнее: ${stats.lastTime}`);
    }

    // Проверяем наших целевых пользователей
    const user25Active = userStats.has(25);
    const user287Active = userStats.has(287);
    
    console.log('\n   🎯 ЦЕЛЕВЫЕ ПОЛЬЗОВАТЕЛИ:');
    console.log(`   • User 25: ${user25Active ? '✅ ПОЛУЧАЕТ начисления' : '❌ НЕТ начислений'}`);
    console.log(`   • User 287: ${user287Active ? '✅ ПОЛУЧАЕТ начисления' : '❌ НЕТ начислений'}`);
  } else {
    console.log('   ❌ ПЛАНИРОВЩИК НЕ АКТИВЕН - нет начислений за 10 минут');
  }

  // 2. Список всех активных TON Boost пользователей
  console.log('\n2. 👥 ВСЕ АКТИВНЫЕ TON BOOST ПОЛЬЗОВАТЕЛИ:');
  const { data: activeBoostUsers } = await supabase
    .from('ton_farming_data')
    .select('user_id, boost_package_id, farming_balance, boost_active, start_date, end_date')
    .eq('boost_active', true)
    .gt('farming_balance', 0)
    .order('user_id');

  if (activeBoostUsers && activeBoostUsers.length > 0) {
    console.log(`   Найдено ${activeBoostUsers.length} активных пользователей:\n`);
    
    activeBoostUsers.forEach(user => {
      console.log(`   User ${user.user_id}:`);
      console.log(`   • Package: ${user.boost_package_id}`);
      console.log(`   • Баланс: ${user.farming_balance} TON`);
      console.log(`   • Активен: ${user.boost_active ? 'ДА' : 'НЕТ'}`);
      
      // Проверка на истечение срока
      if (user.end_date) {
        const endTime = new Date(user.end_date);
        const isExpired = endTime < new Date();
        console.log(`   • Срок: ${isExpired ? '❌ ИСТЕК' : '✅ АКТИВЕН'} (до ${endTime.toLocaleString('ru-RU')})`);
      }
      
      // Проверка получения начислений
      const hasRecentIncome = recentActivity?.some(tx => tx.user_id === user.user_id);
      console.log(`   • Начисления: ${hasRecentIncome ? '✅ ПОЛУЧАЕТ' : '❌ НЕ ПОЛУЧАЕТ'}`);
      console.log('');
    });
  } else {
    console.log('   ❌ Активные пользователи не найдены');
  }

  // 3. Проверка синхронизации между таблицами для User 287
  console.log('3. 🔍 ПРОВЕРКА СИНХРОНИЗАЦИИ ДЛЯ USER 287:');
  
  const { data: user287Users } = await supabase
    .from('users')
    .select('id, ton_boost_package, ton_boost_package_id, ton_boost_rate')
    .eq('id', 287)
    .single();

  const { data: user287Farming } = await supabase
    .from('ton_farming_data')
    .select('user_id, boost_package_id, boost_active, farming_balance')
    .eq('user_id', 287);

  console.log('   Таблица users:');
  if (user287Users) {
    console.log(`   • ton_boost_package: ${user287Users.ton_boost_package || 'NULL'}`);
    console.log(`   • ton_boost_package_id: ${user287Users.ton_boost_package_id || 'NULL'}`);
    console.log(`   • ton_boost_rate: ${user287Users.ton_boost_rate || 'NULL'}`);
  }

  console.log('\n   Таблица ton_farming_data:');
  if (user287Farming && user287Farming.length > 0) {
    user287Farming.forEach((record, index) => {
      console.log(`   Запись ${index + 1}:`);
      console.log(`   • boost_package_id: ${record.boost_package_id}`);
      console.log(`   • boost_active: ${record.boost_active}`);
      console.log(`   • farming_balance: ${record.farming_balance}`);
    });
  }

  // Анализ несоответствий
  const hasUsersRecord = user287Users?.ton_boost_package;
  const hasFarmingRecord = user287Farming?.length > 0 && user287Farming[0].boost_active;
  
  console.log('\n   📊 АНАЛИЗ СИНХРОНИЗАЦИИ:');
  console.log(`   • Запись в users: ${hasUsersRecord ? '✅ ЕСТЬ' : '❌ НЕТ'}`);
  console.log(`   • Запись в farming_data: ${hasFarmingRecord ? '✅ ЕСТЬ' : '❌ НЕТ'}`);
  
  if (hasUsersRecord && hasFarmingRecord) {
    console.log('   ✅ СИНХРОНИЗАЦИЯ КОРРЕКТНА - должен получать начисления');
  } else {
    console.log('   ❌ ПРОБЛЕМА СИНХРОНИЗАЦИИ - может быть причиной отсутствия начислений');
  }

  // 4. Финальные выводы
  console.log('\n4. 🎯 ФИНАЛЬНЫЕ ВЫВОДЫ:');
  console.log('═'.repeat(50));
  
  const plannerActive = recentActivity && recentActivity.length > 0;
  const user25GetsIncome = recentActivity?.some(tx => tx.user_id === 25);
  const user287GetsIncome = recentActivity?.some(tx => tx.user_id === 287);
  
  console.log(`📊 Статус планировщика: ${plannerActive ? '✅ АКТИВЕН' : '❌ НЕ РАБОТАЕТ'}`);
  console.log(`🔴 User 25: ${user25GetsIncome ? '✅ Получает начисления' : '❌ НЕ получает'} (проблема дублирования)`);
  console.log(`🟡 User 287: ${user287GetsIncome ? '✅ Получает начисления' : '❌ НЕ получает'} (селективная проблема)`);
  
  if (plannerActive && !user287GetsIncome && hasFarmingRecord) {
    console.log('\n⚠️ ПОДТВЕРЖДЕНО: Селективная проблема планировщика для User 287');
    console.log('   Планировщик работает глобально, но пропускает конкретного пользователя');
    console.log('   Требуется анализ логики выборки пользователей в планировщике');
  }

  console.log('\n✅ Проверка завершена');
}

// Запуск
finalSchedulerStatusCheck()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });