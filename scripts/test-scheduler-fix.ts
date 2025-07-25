#!/usr/bin/env tsx
/**
 * ТЕСТИРОВАНИЕ ИСПРАВЛЕННОГО ПЛАНИРОВЩИКА
 * Симулируем точный запуск метода processTonBoostIncome()
 */

import { supabase } from '../core/supabase';
import { TonFarmingRepository } from '../modules/boost/TonFarmingRepository';
import { logger } from '../core/logger';

async function testSchedulerFix() {
  console.log('🧪 ТЕСТИРОВАНИЕ ИСПРАВЛЕННОГО ПЛАНИРОВЩИКА');
  console.log('==========================================');
  console.log(`Время: ${new Date().toLocaleString('ru-RU')}\n`);

  try {
    // ШАГ 1: Получаем активных пользователей (как в планировщике)
    console.log('ШАГ 1: 📋 ПОЛУЧЕНИЕ АКТИВНЫХ ПОЛЬЗОВАТЕЛЕЙ');
    
    const tonFarmingRepo = new TonFarmingRepository();
    const activeBoostUsers = await tonFarmingRepo.getActiveBoostUsers();
    
    if (!activeBoostUsers || activeBoostUsers.length === 0) {
      console.log('❌ Нет активных пользователей с TON Boost');
      return;
    }

    console.log(`✅ Найдено ${activeBoostUsers.length} активных TON Boost пользователей`);
    console.log('   Список пользователей:', activeBoostUsers.map(u => `${u.user_id} (${typeof u.user_id})`));

    // ШАГ 2: Преобразование ID (точно как в планировщике)
    console.log('\nШАГ 2: 🔄 ПРЕОБРАЗОВАНИЕ ID ПОЛЬЗОВАТЕЛЕЙ');
    
    const userIds = activeBoostUsers.map(u => {
      const numericId = parseInt(u.user_id.toString());
      if (isNaN(numericId)) {
        console.log(`❌ НЕКОРРЕКТНЫЙ user_id: ${u.user_id} - пропускаем`);
        return null;
      }
      console.log(`✅ ${u.user_id} → ${numericId}`);
      return numericId;
    }).filter(id => id !== null);
    
    if (userIds.length === 0) {
      console.log('❌ Нет корректных пользователей для обработки');
      return;
    }
    
    console.log(`✅ Преобразованные ID пользователей: [${userIds.join(', ')}]`);
    
    // ШАГ 3: Получение балансов (точно как в планировщике)
    console.log('\nШАГ 3: 💰 ПОЛУЧЕНИЕ БАЛАНСОВ ПОЛЬЗОВАТЕЛЕЙ');
    
    const { data: userBalances, error: balanceError } = await supabase
      .from('users')
      .select('id, balance_ton, balance_uni')
      .in('id', userIds);
    
    if (balanceError) {
      console.log(`❌ Ошибка получения балансов:`, balanceError);
      return;
    }
    
    console.log(`✅ Получено балансов: ${userBalances?.length || 0}`);
    console.log('   ID с балансами:', userBalances?.map(u => u.id));
    
    // Создаем мапу для быстрого доступа к балансам
    const balanceMap = new Map(userBalances?.map(u => [u.id, u]) || []);

    let totalProcessed = 0;
    let totalEarned = 0;

    // ШАГ 4: Обработка каждого пользователя (точно как в планировщике)
    console.log('\nШАГ 4: 🔄 ОБРАБОТКА КАЖДОГО ПОЛЬЗОВАТЕЛЯ');
    
    for (const user of activeBoostUsers) {
      try {
        // Получаем актуальные балансы пользователя
        const userId = parseInt(user.user_id.toString());
        if (isNaN(userId)) {
          console.log(`🚫 SKIP: Некорректный user_id: ${user.user_id} - пропускаем`);
          continue;
        }
        
        const userBalance = balanceMap.get(userId);
        if (!userBalance) {
          console.log(`🚫 CRITICAL: Баланс не найден для пользователя ${user.user_id} (ID: ${userId})`);
          console.log(`   Доступные балансы в мапе:`, Array.from(balanceMap.keys()));
          continue;
        }
        
        console.log(`✅ ОБРАБОТКА ПОЛЬЗОВАТЕЛЯ ${user.user_id} (ID: ${userId})`);
        
        // Определяем параметры boost пакета пользователя
        let dailyRate = user.ton_boost_rate || 0.01;
        const userDeposit = Math.max(0, parseFloat(user.farming_balance || '0'));
        
        // Расчет дохода за 5 минут на основе реального депозита
        const dailyIncome = userDeposit * dailyRate;
        const fiveMinuteIncome = dailyIncome / 288; // 288 циклов по 5 минут в день

        console.log(`   Параметры: депозит ${userDeposit} TON, rate ${dailyRate}, доход за 5 мин: ${fiveMinuteIncome.toFixed(8)} TON`);

        // Уменьшаем минимальный порог чтобы обрабатывать даже мелкие депозиты
        if (fiveMinuteIncome <= 0.00001) {
          console.log(`   🚫 SKIP: доход слишком мал (${fiveMinuteIncome.toFixed(8)} TON) - пропускаем`);
          continue;
        }

        console.log(`   ✅ PROCESSING: User ${user.user_id} получит +${fiveMinuteIncome.toFixed(6)} TON`);

        totalProcessed++;
        totalEarned += fiveMinuteIncome;

      } catch (boostError) {
        console.log(`❌ Ошибка обработки пользователя ${user.user_id}:`, boostError);
      }
    }

    console.log(`\n🎯 РЕЗУЛЬТАТ СИМУЛЯЦИИ:`);
    console.log(`✅ Обработано пользователей: ${totalProcessed} из ${activeBoostUsers.length}`);
    console.log(`✅ Общий доход: ${totalEarned.toFixed(6)} TON`);
    
    // Проверяем User 287 специально
    const user287 = activeBoostUsers.find(u => u.user_id === '287' || u.user_id === 287);
    if (user287) {
      const user287Id = parseInt(user287.user_id.toString());
      const user287Balance = balanceMap.get(user287Id);
      const deposit = parseFloat(user287.farming_balance || '0');
      const rate = user287.ton_boost_rate || 0.01;
      const income = (deposit * rate) / 288;
      
      console.log(`\n🎯 СПЕЦИАЛЬНАЯ ПРОВЕРКА USER 287:`);
      console.log(`   User ID: ${user287.user_id} → ${user287Id}`);
      console.log(`   Баланс найден: ${user287Balance ? 'ДА' : 'НЕТ'}`);
      console.log(`   Депозит: ${deposit} TON`);
      console.log(`   Доход за 5 мин: ${income.toFixed(8)} TON`);
      console.log(`   Проходит порог: ${income > 0.00001 ? 'ДА' : 'НЕТ'}`);
      console.log(`   Должен обрабатываться: ${user287Balance && income > 0.00001 ? 'ДА' : 'НЕТ'}`);
    } else {
      console.log('\n❌ USER 287 НЕ НАЙДЕН в списке активных пользователей!');
    }

  } catch (error) {
    console.log('❌ Критическая ошибка тестирования:', error);
  }

  console.log('\n✅ Тестирование планировщика завершено');
}

// Запуск
testSchedulerFix()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });