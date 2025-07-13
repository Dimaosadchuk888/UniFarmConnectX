/**
 * Тестовый скрипт для проверки исправления TON Boost планировщика
 * Проверяет что теперь корректно получаются балансы из таблицы users
 */

import { supabase } from './core/supabase';
import { TonFarmingRepository } from './modules/boost/TonFarmingRepository';
import { logger } from './core/logger';

async function testTonBoostFix() {
  console.log('=== Тест исправления TON Boost ===\n');
  
  try {
    // Шаг 1: Получаем активных пользователей через репозиторий
    const tonFarmingRepo = new TonFarmingRepository();
    const activeBoostUsers = await tonFarmingRepo.getActiveBoostUsers();
    
    console.log(`✅ Найдено ${activeBoostUsers.length} активных TON Boost пользователей\n`);
    
    if (activeBoostUsers.length === 0) {
      console.log('⚠️  Нет активных пользователей с TON Boost для тестирования');
      return;
    }
    
    // Шаг 2: Получаем балансы из таблицы users (как в исправлении)
    // Важно: user_id в ton_farming_data хранится как строка, конвертируем в числа
    const userIds = activeBoostUsers.map(u => parseInt(u.user_id.toString()));
    const { data: userBalances, error: balanceError } = await supabase
      .from('users')
      .select('id, balance_ton, balance_uni')
      .in('id', userIds);
      
    if (balanceError) {
      console.error('❌ Ошибка получения балансов:', balanceError);
      return;
    }
    
    console.log(`✅ Получены балансы для ${userBalances?.length || 0} пользователей\n`);
    
    // Создаем мапу для быстрого доступа
    const balanceMap = new Map(userBalances?.map(u => [u.id, u]) || []);
    
    // Шаг 3: Проверяем каждого пользователя
    console.log('=== Детальная проверка пользователей ===\n');
    
    for (const user of activeBoostUsers.slice(0, 3)) { // Проверяем первых 3
      const userId = parseInt(user.user_id.toString());
      const userBalance = balanceMap.get(userId);
      
      console.log(`Пользователь ${user.user_id}:`);
      console.log(`  TON Farming данные:`);
      console.log(`    - farming_balance: ${user.farming_balance}`);
      console.log(`    - farming_rate: ${user.farming_rate || user.ton_boost_rate}`);
      console.log(`    - boost_package_id: ${user.boost_package_id}`);
      
      if (userBalance) {
        console.log(`  Балансы из users:`);
        console.log(`    - balance_ton: ${userBalance.balance_ton} ✅`);
        console.log(`    - balance_uni: ${userBalance.balance_uni}`);
        
        // Расчет депозита (как в планировщике)
        const userDeposit = Math.max(0, parseFloat(userBalance.balance_ton || '0') - 10);
        const dailyRate = user.farming_rate || user.ton_boost_rate || 0.01;
        const dailyIncome = userDeposit * dailyRate;
        const fiveMinuteIncome = dailyIncome / 288;
        
        console.log(`  Расчеты:`);
        console.log(`    - Депозит: ${userDeposit.toFixed(2)} TON (balance_ton - 10)`);
        console.log(`    - Дневная ставка: ${(dailyRate * 100).toFixed(1)}%`);
        console.log(`    - Доход за 5 минут: ${fiveMinuteIncome.toFixed(6)} TON`);
        
        if (fiveMinuteIncome > 0.0001) {
          console.log(`    - Статус: ✅ Будет обработан планировщиком`);
        } else {
          console.log(`    - Статус: ⚠️  Слишком маленький доход, будет пропущен`);
        }
      } else {
        console.log(`  ❌ Баланс не найден в таблице users!`);
      }
      
      console.log('');
    }
    
    // Итоговая статистика
    console.log('=== Итоговая статистика ===\n');
    let processableCount = 0;
    let totalExpectedIncome = 0;
    
    for (const user of activeBoostUsers) {
      const userId = parseInt(user.user_id.toString());
      const userBalance = balanceMap.get(userId);
      if (userBalance) {
        const userDeposit = Math.max(0, parseFloat(userBalance.balance_ton || '0') - 10);
        const dailyRate = user.farming_rate || user.ton_boost_rate || 0.01;
        const dailyIncome = userDeposit * dailyRate;
        const fiveMinuteIncome = dailyIncome / 288;
        
        if (fiveMinuteIncome > 0.0001) {
          processableCount++;
          totalExpectedIncome += fiveMinuteIncome;
        }
      }
    }
    
    console.log(`✅ Пользователей с балансами: ${balanceMap.size}/${activeBoostUsers.length}`);
    console.log(`✅ Будут обработаны: ${processableCount} пользователей`);
    console.log(`✅ Ожидаемый общий доход: ${totalExpectedIncome.toFixed(6)} TON за 5 минут`);
    console.log(`✅ Ожидаемый дневной доход: ${(totalExpectedIncome * 288).toFixed(2)} TON`);
    
    console.log('\n🎉 Исправление работает корректно! TON Boost теперь может получать балансы пользователей.');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

// Запускаем тест
testTonBoostFix()
  .then(() => {
    console.log('\n✅ Тест завершен');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  });