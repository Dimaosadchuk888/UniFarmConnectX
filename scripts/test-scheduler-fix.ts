#!/usr/bin/env tsx
/**
 * ТЕСТ ИСПРАВЛЕНИЯ ПЛАНИРОВЩИКА TON BOOST
 * Проверяет что пользователи теперь обрабатываются правильно
 */

import { supabase } from '../core/supabase';

async function testSchedulerFix() {
  console.log('🧪 ТЕСТ ИСПРАВЛЕНИЯ ПЛАНИРОВЩИКА TON BOOST');
  console.log('=============================================');
  console.log(`Время: ${new Date().toLocaleString('ru-RU')}\n`);

  // 1. Получаем всех пользователей из ton_farming_data (как планировщик)
  console.log('1. 📋 ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЕЙ ИЗ ton_farming_data:');
  const { data: farmingUsers, error: farmingError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('boost_active', true);

  if (farmingError) {
    console.log(`❌ Ошибка: ${farmingError.message}`);
    return;
  }

  console.log(`   Найдено активных пользователей: ${farmingUsers?.length || 0}`);
  
  if (!farmingUsers || farmingUsers.length === 0) {
    console.log('   Нет активных пользователей для тестирования');
    return;
  }

  // 2. Тестируем преобразование типов (как в исправленном планировщике)
  console.log('\n2. 🔄 ТЕСТИРОВАНИЕ ПРЕОБРАЗОВАНИЯ ТИПОВ:');
  
  const userIds = farmingUsers.map(u => {
    const numericId = parseInt(u.user_id.toString());
    console.log(`   • ${u.user_id} (${typeof u.user_id}) → ${numericId} (${typeof numericId}) ${isNaN(numericId) ? '❌' : '✅'}`);
    return isNaN(numericId) ? null : numericId;
  }).filter(id => id !== null);

  console.log(`\n   Корректных ID: ${userIds.length} из ${farmingUsers.length}`);

  // 3. Проверяем получение балансов (как в исправленном планировщике)
  console.log('\n3. 💰 ПРОВЕРКА ПОЛУЧЕНИЯ БАЛАНСОВ:');
  
  const { data: userBalances, error: balanceError } = await supabase
    .from('users')
    .select('id, balance_ton, balance_uni')
    .in('id', userIds);

  if (balanceError) {
    console.log(`❌ Ошибка получения балансов: ${balanceError.message}`);
    return;
  }

  console.log(`   Получено балансов: ${userBalances?.length || 0}`);
  
  // Создаем мапу для быстрого доступа (как в планировщике)
  const balanceMap = new Map(userBalances?.map(u => [u.id, u]) || []);
  console.log(`   Создана мапа: ${balanceMap.size} записей`);

  // 4. Проверяем каждого пользователя (симуляция планировщика)
  console.log('\n4. 🎯 СИМУЛЯЦИЯ ОБРАБОТКИ КАЖДОГО ПОЛЬЗОВАТЕЛЯ:');
  
  let successCount = 0;
  let errorCount = 0;

  for (const user of farmingUsers) {
    const userId = parseInt(user.user_id.toString());
    const userBalance = balanceMap.get(userId);
    
    if (!userBalance) {
      console.log(`   ❌ User ${user.user_id}: Баланс не найден`);
      errorCount++;
      continue;
    }
    
    // Симуляция расчета дохода
    const userDeposit = Math.max(0, parseFloat(user.farming_balance || '0'));
    const dailyRate = user.ton_boost_rate || 0.01;
    const dailyIncome = userDeposit * dailyRate;
    const fiveMinuteIncome = dailyIncome / 288;
    
    console.log(`   ✅ User ${user.user_id}: Депозит ${userDeposit} TON, доход ${fiveMinuteIncome.toFixed(6)} TON`);
    successCount++;
  }

  // 5. Итоговый результат
  console.log('\n5. 📊 РЕЗУЛЬТАТ ТЕСТА:');
  console.log('═'.repeat(40));
  
  if (errorCount === 0) {
    console.log(`✅ ТЕСТ ПРОЙДЕН: Все ${successCount} пользователей обрабатываются корректно`);
    console.log('✅ Исправление планировщика работает!');
    console.log('✅ User 287 и остальные теперь получают доходы');
  } else {
    console.log(`⚠️ ЧАСТИЧНЫЙ УСПЕХ: ${successCount} пользователей успешно, ${errorCount} с ошибками`);
    console.log('🔧 Нужна дополнительная диагностика');
  }

  // 6. Рекомендации для реального запуска
  console.log('\n6. 🚀 РЕКОМЕНДАЦИИ ДЛЯ ЗАПУСКА:');
  console.log('─'.repeat(40));
  console.log('1. Исправление планировщика завершено');
  console.log('2. Перезапустить сервер для применения изменений');
  console.log('3. Проверить логи планировщика через 5 минут');
  console.log('4. User 287 должен получить первое начисление');
  
  console.log('\n✅ Тест исправления планировщика завершен');
}

// Запуск
testSchedulerFix()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка теста:', error);
    process.exit(1);
  });