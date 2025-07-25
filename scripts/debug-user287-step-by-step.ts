#!/usr/bin/env tsx
/**
 * ПОШАГОВАЯ ДИАГНОСТИКА USER 287
 * Симулируем ТОЧНЫЙ алгоритм планировщика для поиска проблемы
 */

import { supabase } from '../core/supabase';
import { TonFarmingRepository } from '../modules/boost/TonFarmingRepository';

async function debugUser287StepByStep() {
  console.log('🔬 ПОШАГОВАЯ ДИАГНОСТИКА USER 287');
  console.log('==================================');
  console.log(`Время: ${new Date().toLocaleString('ru-RU')}\n`);

  // ШАГ 1: Точно повторяем логику планировщика
  console.log('ШАГ 1: 📋 ПОЛУЧЕНИЕ АКТИВНЫХ ПОЛЬЗОВАТЕЛЕЙ');
  
  const tonFarmingRepo = new TonFarmingRepository();
  const activeBoostUsers = await tonFarmingRepo.getActiveBoostUsers();
  
  console.log(`   Всего активных пользователей: ${activeBoostUsers.length}`);
  console.log(`   Список пользователей:`, activeBoostUsers.map(u => u.user_id));
  
  const user287Data = activeBoostUsers.find(u => u.user_id === '287' || u.user_id === 287);
  if (user287Data) {
    console.log(`   ✅ User 287 НАЙДЕН в списке активных:`, {
      user_id: user287Data.user_id,
      type: typeof user287Data.user_id,
      boost_active: user287Data.boost_active,
      farming_balance: user287Data.farming_balance,
      boost_package_id: user287Data.boost_package_id
    });
  } else {
    console.log('   ❌ User 287 НЕ НАЙДЕН в списке активных пользователей!');
    console.log('   🚨 ЭТО ГЛАВНАЯ ПРОБЛЕМА!');
    return;
  }

  // ШАГ 2: Преобразование ID (как в планировщике)
  console.log('\nШАГ 2: 🔄 ПРЕОБРАЗОВАНИЕ ID ПОЛЬЗОВАТЕЛЕЙ');
  
  const userIds = activeBoostUsers.map(u => {
    const numericId = parseInt(u.user_id.toString());
    console.log(`   ${u.user_id} (${typeof u.user_id}) → ${numericId} (${typeof numericId}) ${isNaN(numericId) ? '❌' : '✅'}`);
    return isNaN(numericId) ? null : numericId;
  }).filter(id => id !== null);

  console.log(`   Корректных ID: ${userIds.length} из ${activeBoostUsers.length}`);
  const user287NumericId = parseInt(user287Data.user_id.toString());
  console.log(`   User 287 преобразуется в: ${user287NumericId}`);

  // ШАГ 3: Получение балансов (как в планировщике)
  console.log('\nШАГ 3: 💰 ПОЛУЧЕНИЕ БАЛАНСОВ ПОЛЬЗОВАТЕЛЕЙ');
  
  const { data: userBalances, error: balanceError } = await supabase
    .from('users')
    .select('id, balance_ton, balance_uni')
    .in('id', userIds);

  if (balanceError) {
    console.log(`   ❌ Ошибка получения балансов: ${balanceError.message}`);
    return;
  }

  console.log(`   Получено балансов: ${userBalances?.length || 0}`);
  console.log(`   ID пользователей с балансами:`, userBalances?.map(u => u.id));
  
  const balanceMap = new Map(userBalances?.map(u => [u.id, u]) || []);
  const user287Balance = balanceMap.get(user287NumericId);
  
  if (user287Balance) {
    console.log(`   ✅ User 287 баланс НАЙДЕН:`, {
      id: user287Balance.id,
      balance_ton: user287Balance.balance_ton,
      balance_uni: user287Balance.balance_uni
    });
  } else {
    console.log(`   ❌ User 287 баланс НЕ НАЙДЕН в мапе!`);
    console.log(`   🔍 Ищем в массиве:`, userBalances?.find(u => u.id === user287NumericId));
    console.log(`   🚨 ПРОБЛЕМА С ПОЛУЧЕНИЕМ БАЛАНСА!`);
    return;
  }

  // ШАГ 4: Расчет дохода (как в планировщике)
  console.log('\nШАГ 4: 💵 РАСЧЕТ ДОХОДА USER 287');
  
  const dailyRate = user287Data.ton_boost_rate || 0.01;
  const userDeposit = Math.max(0, parseFloat(user287Data.farming_balance || '0'));
  const dailyIncome = userDeposit * dailyRate;
  const fiveMinuteIncome = dailyIncome / 288;
  
  console.log(`   Параметры расчета:`, {
    dailyRate: dailyRate,
    userDeposit: userDeposit,
    dailyIncome: dailyIncome,
    fiveMinuteIncome: fiveMinuteIncome
  });

  // ШАГ 5: Проверка порога (как в планировщике)
  console.log('\nШАГ 5: 🎯 ПРОВЕРКА МИНИМАЛЬНОГО ПОРОГА');
  
  const threshold = 0.00001;
  const passesThreshold = fiveMinuteIncome > threshold;
  
  console.log(`   Минимальный порог: ${threshold}`);
  console.log(`   Доход User 287: ${fiveMinuteIncome.toFixed(8)} TON`);
  console.log(`   Проходит проверку: ${passesThreshold ? 'ДА ✅' : 'НЕТ ❌'}`);

  if (!passesThreshold) {
    console.log('   🚨 User 287 НЕ ПРОХОДИТ минимальный порог!');
    console.log('   💡 Это объясняет почему он не получает доходы');
    return;
  }

  // ШАГ 6: Симуляция создания транзакции
  console.log('\nШАГ 6: 📝 СИМУЛЯЦИЯ СОЗДАНИЯ ТРАНЗАКЦИИ');
  
  console.log(`   User 287 должен получить: ${fiveMinuteIncome.toFixed(6)} TON`);
  console.log(`   Описание: "TON Boost доход (пакет ${user287Data.boost_package_id}): ${fiveMinuteIncome.toFixed(6)} TON"`);
  console.log(`   Новый баланс: ${(parseFloat(user287Balance.balance_ton || '0') + fiveMinuteIncome).toFixed(6)} TON`);

  // ВЫВОД
  console.log('\n🎯 ЗАКЛЮЧЕНИЕ:');
  console.log('═'.repeat(40));
  
  if (user287Data && user287Balance && passesThreshold) {
    console.log('✅ User 287 проходит ВСЕ проверки планировщика!');
    console.log('✅ Он ДОЛЖЕН получать доходы каждые 5 минут');
    console.log('🔧 Проблема может быть в:');
    console.log('   • Кэшировании старой версии планировщика');
    console.log('   • Ошибках во время выполнения транзакции');
    console.log('   • Проблемах с WebSocket уведомлениями');
    console.log('💡 Рекомендуется перезапуск планировщика');
  } else {
    console.log('❌ User 287 НЕ проходит некоторые проверки');
    console.log('🔍 Требуется дополнительная диагностика');
  }

  console.log('\n✅ Пошаговая диагностика завершена');
}

// Запуск
debugUser287StepByStep()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка диагностики:', error);
    process.exit(1);
  });