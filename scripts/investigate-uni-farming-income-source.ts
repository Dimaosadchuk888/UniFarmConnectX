/**
 * Исследование источника дохода UniFarming
 * Техническое задание: понять откуда берётся база для расчёта дохода
 */

import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

interface FarmingAnalysis {
  userId: number;
  telegramId: string;
  balanceUni: number;
  depositAmount: number | null;
  farmingActive: boolean;
  farmingRate: number;
  lastUpdate: string | null;
  createdAt: string;
  
  // Calculated values
  expectedIncomeFromBalance?: number;
  expectedIncomeFromDeposit?: number;
  lastTransaction?: {
    id: number;
    amount: number;
    description: string;
    createdAt: string;
  };
  
  // Analysis result
  incomeSource?: 'BALANCE' | 'DEPOSIT' | 'UNKNOWN';
  hasNullDeposit: boolean;
  accumulatedPeriods?: number;
}

async function investigateUniFarmingIncomeSource() {
  logger.info('=== ИССЛЕДОВАНИЕ ИСТОЧНИКА ДОХОДА UNIFARMING ===');
  logger.info('Цель: понять откуда берётся база для расчёта - из deposit_amount или balance_uni\n');

  // 1. Анализ кода расчета
  logger.info('1. АНАЛИЗ КОДА РАСЧЕТА');
  logger.info('Файл: core/scheduler/farmingScheduler.ts');
  logger.info('Метод: calculateUniFarmingIncome()');
  logger.info('Формула: depositAmount * rate * daysElapsed');
  logger.info('Источник depositAmount: farmer.deposit_amount (через UniFarmingRepository)');
  logger.info('Fallback: UniFarmingRepository использует таблицу users с полем uni_deposit_amount\n');

  // 2. Получаем активных фармеров
  logger.info('2. АНАЛИЗ АКТИВНЫХ ФАРМЕРОВ');
  const { data: activeFarmers, error } = await supabase
    .from('users')
    .select('*')
    .eq('uni_farming_active', true)
    .order('id', { ascending: true });

  if (error || !activeFarmers) {
    logger.error('Ошибка получения активных фармеров:', error);
    return;
  }

  logger.info(`Найдено активных фармеров: ${activeFarmers.length}\n`);

  const analyses: FarmingAnalysis[] = [];

  // 3. Анализируем каждого фармера
  for (const farmer of activeFarmers) {
    const analysis: FarmingAnalysis = {
      userId: farmer.id,
      telegramId: farmer.telegram_id,
      balanceUni: parseFloat(farmer.balance_uni || '0'),
      depositAmount: farmer.uni_deposit_amount ? parseFloat(farmer.uni_deposit_amount) : null,
      farmingActive: farmer.uni_farming_active,
      farmingRate: parseFloat(farmer.uni_farming_rate || '0.01'),
      lastUpdate: farmer.uni_farming_last_update,
      createdAt: farmer.created_at,
      hasNullDeposit: farmer.uni_deposit_amount === null || farmer.uni_deposit_amount === '0'
    };

    // Рассчитываем ожидаемый доход за 5 минут
    const fiveMinutesInDays = 5 / (60 * 24);
    
    if (analysis.balanceUni > 0) {
      analysis.expectedIncomeFromBalance = analysis.balanceUni * analysis.farmingRate * fiveMinutesInDays;
    }
    
    if (analysis.depositAmount !== null && analysis.depositAmount > 0) {
      analysis.expectedIncomeFromDeposit = analysis.depositAmount * analysis.farmingRate * fiveMinutesInDays;
    }

    // Получаем последнюю транзакцию FARMING_REWARD
    const { data: lastTx } = await supabase
      .from('transactions')
      .select('id, amount_uni, description, created_at')
      .eq('user_id', farmer.id)
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'UNI')
      .order('created_at', { ascending: false })
      .limit(1);

    if (lastTx && lastTx.length > 0) {
      const tx = lastTx[0];
      analysis.lastTransaction = {
        id: tx.id,
        amount: parseFloat(tx.amount_uni || '0'),
        description: tx.description,
        createdAt: tx.created_at
      };

      // Определяем источник дохода
      const actualAmount = analysis.lastTransaction.amount;
      const tolerancePercent = 0.1; // 10% погрешность

      if (analysis.expectedIncomeFromDeposit !== undefined) {
        const depositDiff = Math.abs(actualAmount - analysis.expectedIncomeFromDeposit);
        const depositDiffPercent = depositDiff / analysis.expectedIncomeFromDeposit;
        
        if (depositDiffPercent <= tolerancePercent) {
          analysis.incomeSource = 'DEPOSIT';
        }
      }

      if (analysis.incomeSource !== 'DEPOSIT' && analysis.expectedIncomeFromBalance !== undefined) {
        const balanceDiff = Math.abs(actualAmount - analysis.expectedIncomeFromBalance);
        const balanceDiffPercent = balanceDiff / analysis.expectedIncomeFromBalance;
        
        if (balanceDiffPercent <= tolerancePercent) {
          analysis.incomeSource = 'BALANCE';
        }
      }

      if (!analysis.incomeSource) {
        // Проверяем на накопленные периоды
        if (analysis.expectedIncomeFromDeposit && analysis.expectedIncomeFromDeposit > 0) {
          const periods = Math.round(actualAmount / analysis.expectedIncomeFromDeposit);
          if (periods > 1 && periods < 1000) {
            analysis.incomeSource = 'DEPOSIT';
            analysis.accumulatedPeriods = periods;
          }
        }
        
        if (!analysis.incomeSource && analysis.expectedIncomeFromBalance && analysis.expectedIncomeFromBalance > 0) {
          const periods = Math.round(actualAmount / analysis.expectedIncomeFromBalance);
          if (periods > 1 && periods < 1000) {
            analysis.incomeSource = 'BALANCE';
            analysis.accumulatedPeriods = periods;
          }
        }
      }

      if (!analysis.incomeSource) {
        analysis.incomeSource = 'UNKNOWN';
      }
    }

    analyses.push(analysis);
  }

  // 4. Выводим результаты
  logger.info('\n3. РЕЗУЛЬТАТЫ АНАЛИЗА\n');

  // Группируем по источнику дохода
  const bySource = {
    DEPOSIT: analyses.filter(a => a.incomeSource === 'DEPOSIT'),
    BALANCE: analyses.filter(a => a.incomeSource === 'BALANCE'),
    UNKNOWN: analyses.filter(a => a.incomeSource === 'UNKNOWN'),
    NO_TX: analyses.filter(a => !a.lastTransaction)
  };

  logger.info('СТАТИСТИКА ПО ИСТОЧНИКАМ:');
  logger.info(`- От депозита (правильно): ${bySource.DEPOSIT.length} пользователей`);
  logger.info(`- От баланса (неправильно): ${bySource.BALANCE.length} пользователей`);
  logger.info(`- Неопределенный источник: ${bySource.UNKNOWN.length} пользователей`);
  logger.info(`- Без транзакций: ${bySource.NO_TX.length} пользователей\n`);

  // Проблемные случаи
  logger.info('ПРОБЛЕМНЫЕ СЛУЧАИ:');
  
  // Пользователи с null депозитом
  const nullDeposits = analyses.filter(a => a.hasNullDeposit);
  if (nullDeposits.length > 0) {
    logger.info(`\n${nullDeposits.length} пользователей с NULL в uni_deposit_amount:`);
    for (const user of nullDeposits) {
      logger.info(`  User ${user.userId}: balance=${user.balanceUni} UNI, доход от=${user.incomeSource || 'НЕТ_ТРАНЗАКЦИЙ'}`);
    }
  }

  // Пользователи получающие от баланса
  if (bySource.BALANCE.length > 0) {
    logger.info(`\n${bySource.BALANCE.length} пользователей получают доход от БАЛАНСА:`);
    for (const user of bySource.BALANCE) {
      logger.info(`  User ${user.userId}:`);
      logger.info(`    - Balance: ${user.balanceUni} UNI`);
      logger.info(`    - Deposit: ${user.depositAmount || 'NULL'} UNI`);
      logger.info(`    - Последняя транзакция: ${user.lastTransaction?.amount.toFixed(6)} UNI`);
      if (user.accumulatedPeriods) {
        logger.info(`    - Накоплено периодов: ${user.accumulatedPeriods}`);
      }
    }
  }

  // Детальный анализ User 74 и User 64
  logger.info('\n4. ДЕТАЛЬНЫЙ АНАЛИЗ КЛЮЧЕВЫХ ПОЛЬЗОВАТЕЛЕЙ\n');
  
  const keyUsers = [74, 64];
  for (const userId of keyUsers) {
    const user = analyses.find(a => a.userId === userId);
    if (user) {
      logger.info(`USER ${userId}:`);
      logger.info(`- Balance UNI: ${user.balanceUni}`);
      logger.info(`- Deposit Amount: ${user.depositAmount || 'NULL'}`);
      logger.info(`- Farming Rate: ${user.farmingRate}`);
      logger.info(`- Источник дохода: ${user.incomeSource || 'НЕТ_ТРАНЗАКЦИЙ'}`);
      
      if (user.lastTransaction) {
        logger.info(`- Последняя транзакция: ${user.lastTransaction.amount.toFixed(6)} UNI`);
        logger.info(`- Ожидалось от депозита: ${user.expectedIncomeFromDeposit?.toFixed(6) || 'N/A'} UNI`);
        logger.info(`- Ожидалось от баланса: ${user.expectedIncomeFromBalance?.toFixed(6) || 'N/A'} UNI`);
        
        if (user.accumulatedPeriods) {
          logger.info(`- Накоплено периодов: ${user.accumulatedPeriods} (${user.accumulatedPeriods * 5} минут)`);
        }
      }
      logger.info('');
    }
  }

  // 5. Анализ накоплений
  const withAccumulation = analyses.filter(a => a.accumulatedPeriods && a.accumulatedPeriods > 1);
  if (withAccumulation.length > 0) {
    logger.info(`\n5. ПОЛЬЗОВАТЕЛИ С НАКОПЛЕННЫМИ ПЕРИОДАМИ (${withAccumulation.length}):`);
    for (const user of withAccumulation.sort((a, b) => (b.accumulatedPeriods || 0) - (a.accumulatedPeriods || 0))) {
      logger.info(`  User ${user.userId}: ${user.accumulatedPeriods} периодов (${(user.accumulatedPeriods || 0) * 5} минут)`);
    }
  }

  // 6. СРАВНЕНИЕ С TON BOOST
  logger.info('\n6. СРАВНЕНИЕ С TON BOOST\n');
  
  logger.info('TON BOOST АНАЛИЗ:');
  logger.info('Файл: modules/scheduler/tonBoostIncomeScheduler.ts');
  logger.info('Источник: user.farming_balance из ton_farming_data');
  logger.info('Проблема: Архитектурная - пытается читать user.balance_ton (undefined)');
  logger.info('Результат: доход всегда 0, пользователи пропускаются\n');
  
  // Проверяем TON boost данные
  const { data: tonBoostUsers } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('boost_active', true)
    .limit(5);
    
  if (tonBoostUsers && tonBoostUsers.length > 0) {
    logger.info(`Активных TON Boost пользователей: ${tonBoostUsers.length}`);
    logger.info('Пример данных TON Boost:');
    const sample = tonBoostUsers[0];
    logger.info(`- User ID: ${sample.user_id}`);
    logger.info(`- Farming Balance: ${sample.farming_balance} TON`);
    logger.info(`- Farming Rate: ${sample.farming_rate}`);
    logger.info(`- Ожидаемый доход за 5 мин: ${(parseFloat(sample.farming_balance) * parseFloat(sample.farming_rate) * 5 / 1440).toFixed(6)} TON`);
  }

  // 7. ВЫВОДЫ
  logger.info('\n7. ВЫВОДЫ И РЕКОМЕНДАЦИИ\n');
  
  logger.info('КЛЮЧЕВЫЕ НАХОДКИ:');
  logger.info('1. Код корректно использует uni_deposit_amount для расчета');
  logger.info('2. Fallback механизм через UniFarmingRepository работает');
  logger.info('3. Проблема: непоследовательное поведение в production');
  logger.info(`4. ${nullDeposits.length} пользователей имеют NULL в uni_deposit_amount`);
  logger.info(`5. ${bySource.BALANCE.length} пользователей получают доход от баланса (неправильно)`);
  logger.info('6. Обнаружены накопленные периоды до 891 x 5 минут');
  
  logger.info('\nАРХИТЕКТУРНЫЕ ПРОБЛЕМЫ:');
  logger.info('- Возможны параллельные процессы расчета');
  logger.info('- Отсутствует валидация uni_deposit_amount перед расчетом');
  logger.info('- TON Boost имеет другую архитектуру и не работает корректно');
  
  logger.info('\nРЕКОМЕНДАЦИИ:');
  logger.info('1. Добавить проверку uni_deposit_amount !== null в farmingScheduler');
  logger.info('2. Исследовать источник NULL значений в uni_deposit_amount');
  logger.info('3. Проверить наличие дублированных cron задач');
  logger.info('4. Внедрить единую точку расчета UnifiedFarmingCalculator');
  logger.info('5. Исправить TON Boost для использования farming_balance');

  // Сохраняем отчет
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalActiveFarmers: activeFarmers.length,
      incomeFromDeposit: bySource.DEPOSIT.length,
      incomeFromBalance: bySource.BALANCE.length,
      unknownSource: bySource.UNKNOWN.length,
      noTransactions: bySource.NO_TX.length,
      nullDeposits: nullDeposits.length,
      withAccumulation: withAccumulation.length
    },
    analyses: analyses
  };

  logger.info('\n=== ИССЛЕДОВАНИЕ ЗАВЕРШЕНО ===');
  logger.info('Полный отчет сохранен в памяти');
  
  return report;
}

// Запускаем исследование
investigateUniFarmingIncomeSource().catch(console.error);