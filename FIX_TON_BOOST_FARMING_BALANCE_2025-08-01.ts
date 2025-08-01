// ИСПРАВЛЕНИЕ FARMING_BALANCE ДЛЯ TON BOOST ПОЛЬЗОВАТЕЛЕЙ
// Заполняем farming_balance на основе реальных TON депозитов
// Дата: 01 августа 2025

import { supabase } from './core/supabase';
import { logger } from './core/logger';

interface DepositAnalysis {
  user_id: number;
  current_farming_balance: string;
  total_ton_deposits: number;
  total_boost_purchases: number;
  calculated_farming_balance: number;
  needs_update: boolean;
}

async function analyzeAndFixFarmingBalances(): Promise<void> {
  console.log('🔧 ИСПРАВЛЕНИЕ FARMING_BALANCE ДЛЯ TON BOOST ПОЛЬЗОВАТЕЛЕЙ');
  console.log('='.repeat(80));

  // 1. Получаем всех пользователей с активным TON Boost
  const { data: activeBoostUsers, error: boostError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('boost_active', true);

  if (boostError) {
    console.log(`❌ Ошибка получения TON Boost пользователей: ${boostError.message}`);
    return;
  }

  console.log(`👥 Найдено пользователей с активным TON Boost: ${activeBoostUsers?.length || 0}`);

  if (!activeBoostUsers || activeBoostUsers.length === 0) {
    console.log('⚠️ Нет пользователей для обработки');
    return;
  }

  const analyses: DepositAnalysis[] = [];
  let totalFixed = 0;
  let totalSkipped = 0;

  // 2. Анализируем каждого пользователя
  for (const user of activeBoostUsers) {
    try {
      console.log(`\n🔍 Анализ пользователя ${user.user_id}:`);
      console.log(`   Текущий farming_balance: ${user.farming_balance}`);

      // Получаем все TON депозиты пользователя
      const { data: deposits, error: depositsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', parseInt(user.user_id))
        .in('type', ['TON_DEPOSIT', 'DEPOSIT', 'BOOST_PURCHASE'])
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      if (depositsError) {
        console.log(`   ❌ Ошибка получения депозитов: ${depositsError.message}`);
        continue;
      }

      // Рассчитываем общую сумму депозитов
      let totalTonDeposits = 0;
      let totalBoostPurchases = 0;

      if (deposits && deposits.length > 0) {
        console.log(`   📊 Найдено транзакций: ${deposits.length}`);
        
        for (const deposit of deposits) {
          const amount = parseFloat(deposit.amount_ton || '0');
          
          if (deposit.type === 'BOOST_PURCHASE' || 
              (deposit.metadata && 
               (typeof deposit.metadata === 'string' ? 
                JSON.parse(deposit.metadata).original_type === 'TON_BOOST_PURCHASE' :
                deposit.metadata.original_type === 'TON_BOOST_PURCHASE'))) {
            totalBoostPurchases += amount;
            console.log(`      BOOST_PURCHASE: ${amount} TON (${deposit.created_at.substring(0, 10)})`);
          } else if (deposit.type === 'TON_DEPOSIT' || deposit.type === 'DEPOSIT') {
            totalTonDeposits += amount;
            console.log(`      ${deposit.type}: ${amount} TON (${deposit.created_at.substring(0, 10)})`);
          }
        }
      } else {
        console.log(`   ⚠️ Нет депозитов найдено`);
      }

      // Рассчитываем правильный farming_balance
      const calculatedBalance = totalTonDeposits + totalBoostPurchases;
      const currentBalance = parseFloat(user.farming_balance || '0');
      const needsUpdate = Math.abs(calculatedBalance - currentBalance) > 0.000001;

      console.log(`   💰 TON депозиты: ${totalTonDeposits.toFixed(6)} TON`);
      console.log(`   🎯 Boost покупки: ${totalBoostPurchases.toFixed(6)} TON`);
      console.log(`   📊 Расчетный баланс: ${calculatedBalance.toFixed(6)} TON`);
      console.log(`   📈 Текущий баланс: ${currentBalance.toFixed(6)} TON`);
      console.log(`   ${needsUpdate ? '🔧 ТРЕБУЕТ ОБНОВЛЕНИЯ' : '✅ КОРРЕКТЕН'}`);

      const analysis: DepositAnalysis = {
        user_id: parseInt(user.user_id),
        current_farming_balance: user.farming_balance,
        total_ton_deposits: totalTonDeposits,
        total_boost_purchases: totalBoostPurchases,
        calculated_farming_balance: calculatedBalance,
        needs_update: needsUpdate
      };

      analyses.push(analysis);

      // 3. Обновляем если необходимо
      if (needsUpdate && calculatedBalance > 0) {
        console.log(`   🔧 Обновляем farming_balance: ${currentBalance} → ${calculatedBalance}`);
        
        const { error: updateError } = await supabase
          .from('ton_farming_data')
          .update({
            farming_balance: calculatedBalance.toString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.user_id);

        if (updateError) {
          console.log(`   ❌ Ошибка обновления: ${updateError.message}`);
        } else {
          console.log(`   ✅ Успешно обновлен`);
          totalFixed++;
          
          // Также обновляем в таблице users для синхронизации
          await supabase
            .from('users')
            .update({
              ton_farming_balance: calculatedBalance.toString()
            })
            .eq('id', parseInt(user.user_id));
        }
      } else if (calculatedBalance === 0) {
        console.log(`   ⚠️ Нет депозитов - пользователь будет пропущен планировщиком`);
        totalSkipped++;
      } else {
        console.log(`   ✅ Баланс уже корректен`);
      }

    } catch (error) {
      console.log(`   ❌ Ошибка обработки пользователя ${user.user_id}: ${error}`);
    }
  }

  // 4. Итоговая статистика
  console.log('\n' + '='.repeat(80));
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
  console.log('='.repeat(80));

  console.log(`👥 Всего проанализировано: ${analyses.length} пользователей`);
  console.log(`🔧 Обновлено балансов: ${totalFixed}`);
  console.log(`⚠️ Пропущено (нет депозитов): ${totalSkipped}`);
  console.log(`✅ Уже корректных: ${analyses.length - totalFixed - totalSkipped}`);

  // Группируем по статусу
  const withBalance = analyses.filter(a => a.calculated_farming_balance > 0);
  const withoutBalance = analyses.filter(a => a.calculated_farming_balance === 0);

  console.log(`\n📈 ПОЛЬЗОВАТЕЛИ С ДЕПОЗИТАМИ (${withBalance.length}):`);
  withBalance.forEach(user => {
    console.log(`   User ${user.user_id}: ${user.calculated_farming_balance.toFixed(6)} TON`);
  });

  if (withoutBalance.length > 0) {
    console.log(`\n⚠️ ПОЛЬЗОВАТЕЛИ БЕЗ ДЕПОЗИТОВ (${withoutBalance.length}):`);
    withoutBalance.forEach(user => {
      console.log(`   User ${user.user_id}: 0 TON (будет пропущен планировщиком)`);
    });
  }

  // 5. Прогноз доходности после исправления
  console.log(`\n💰 ПРОГНОЗ ДОХОДНОСТИ TON BOOST:`);
  
  let totalDailyIncome = 0;
  let activeFarmers = 0;

  for (const user of withBalance) {
    if (user.calculated_farming_balance > 0) {
      const dailyRate = 0.01; // 1% в день
      const dailyIncome = user.calculated_farming_balance * dailyRate;
      const fiveMinIncome = dailyIncome / 288;
      
      if (fiveMinIncome > 0.00001) {
        totalDailyIncome += dailyIncome;
        activeFarmers++;
      }
    }
  }

  console.log(`👤 Активных фермеров TON Boost: ${activeFarmers}`);
  console.log(`💵 Общий дневной доход: ${totalDailyIncome.toFixed(6)} TON`);
  console.log(`⏰ Доход каждые 5 минут: ${(totalDailyIncome / 288).toFixed(8)} TON`);
  console.log(`📊 Транзакций в день: ${activeFarmers * 288} штук`);

  if (totalFixed > 0) {
    console.log(`\n🎉 ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!`);
    console.log(`🚀 Планировщик TON Boost теперь будет начислять награды ${totalFixed} дополнительным пользователям`);
    console.log(`💡 Рекомендация: проверить логи планировщика через 5-10 минут`);
  }
}

async function verifyPlannerWillWork(): Promise<void> {
  console.log('\n🔍 ПРОВЕРКА ГОТОВНОСТИ ПЛАНИРОВЩИКА');
  console.log('='.repeat(50));

  // Имитируем логику планировщика после исправления
  const { data: activeUsers, error } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('boost_active', true);

  if (error || !activeUsers) {
    console.log('❌ Не удалось получить данные для проверки');
    return;
  }

  let willProcess = 0;
  let willSkip = 0;

  for (const user of activeUsers) {
    const farmingBalance = parseFloat(user.farming_balance || '0');
    const dailyRate = 0.01;
    const fiveMinIncome = (farmingBalance * dailyRate) / 288;

    if (fiveMinIncome > 0.00001) {
      willProcess++;
    } else {
      willSkip++;
    }
  }

  console.log(`✅ Планировщик будет обрабатывать: ${willProcess} пользователей`);
  console.log(`⚠️ Планировщик будет пропускать: ${willSkip} пользователей`);
  console.log(`📊 Эффективность: ${((willProcess / activeUsers.length) * 100).toFixed(1)}%`);

  if (willProcess > 0) {
    console.log(`🎯 РЕЗУЛЬТАТ: TON Boost планировщик будет генерировать награды!`);
  } else {
    console.log(`❌ ПРОБЛЕМА: Планировщик по-прежнему не будет генерировать награды`);
  }
}

async function main(): Promise<void> {
  console.log('🔧 СИСТЕМА ИСПРАВЛЕНИЯ TON BOOST FARMING_BALANCE');
  console.log('='.repeat(80));
  console.log('Дата:', new Date().toISOString());
  console.log('Цель: Исправить farming_balance на основе реальных депозитов');
  console.log('');

  await analyzeAndFixFarmingBalances();
  await verifyPlannerWillWork();

  console.log('\n🏁 ИСПРАВЛЕНИЕ ЗАВЕРШЕНО');
  console.log('Планировщик TON Boost теперь должен корректно начислять награды');
}

// Запуск исправления
main().catch(console.error);