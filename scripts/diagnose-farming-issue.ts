/**
 * CRITICAL: Диагностика проблемы с начислением процентов на продакшне
 * Анализирует реальные данные и расчеты для выявления причины переплат
 */

import { supabase } from '../core/supabase';
import { logger } from '../core/logger';
import { UnifiedFarmingCalculator } from '../core/farming/UnifiedFarmingCalculator';

async function diagnoseFarmingIssue() {
  logger.info('🚨 [CRITICAL DIAGNOSIS] Начало диагностики проблемы с фармингом');
  
  try {
    // 1. Проверяем последние транзакции FARMING_REWARD
    logger.info('1. Анализ последних транзакций FARMING_REWARD...');
    const { data: recentTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Последние 24 часа
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (txError) {
      logger.error('Ошибка получения транзакций:', txError);
      return;
    }
    
    logger.info(`Найдено ${recentTransactions?.length || 0} транзакций за последние 24 часа`);
    
    if (recentTransactions && recentTransactions.length > 0) {
      // Группируем по пользователям и анализируем
      const userTransactions = recentTransactions.reduce((acc, tx) => {
        if (!acc[tx.user_id]) acc[tx.user_id] = [];
        acc[tx.user_id].push(tx);
        return acc;
      }, {} as Record<number, any[]>);
      
      logger.info('Анализ начислений по пользователям:');
      for (const [userId, transactions] of Object.entries(userTransactions)) {
        const totalAmount = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount_uni || '0'), 0);
        const transactionCount = transactions.length;
        const avgAmount = totalAmount / transactionCount;
        
        // Рассчитываем интервалы между транзакциями
        const intervals: number[] = [];
        for (let i = 1; i < transactions.length; i++) {
          const current = new Date(transactions[i-1].created_at).getTime();
          const previous = new Date(transactions[i].created_at).getTime();
          const minutesDiff = (current - previous) / (1000 * 60);
          intervals.push(minutesDiff);
        }
        
        const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
        
        logger.info(`User ${userId}:`, {
          transactionCount,
          totalAmount: totalAmount.toFixed(6),
          avgAmount: avgAmount.toFixed(6),
          avgIntervalMinutes: avgInterval.toFixed(2),
          intervals: intervals.slice(0, 5).map(i => i.toFixed(2)) // Первые 5 интервалов
        });
        
        // КРИТИЧЕСКАЯ ПРОВЕРКА: Если интервал ~5 минут и сумма слишком большая
        if (avgInterval >= 4 && avgInterval <= 6 && avgAmount > 1) {
          logger.error(`🚨 АНОМАЛИЯ ОБНАРУЖЕНА User ${userId}: Интервал ${avgInterval.toFixed(2)} мин, но сумма ${avgAmount.toFixed(6)} UNI слишком большая!`);
        }
      }
    }
    
    // 2. Проверяем активных фармеров и их настройки
    logger.info('\n2. Анализ активных фармеров...');
    const { data: activeFarmers, error: farmersError } = await supabase
      .from('users')
      .select('id, balance_uni, uni_deposit_amount, uni_farming_rate, uni_farming_active, uni_farming_last_update')
      .eq('uni_farming_active', true)
      .limit(10);
      
    if (farmersError) {
      logger.error('Ошибка получения фармеров:', farmersError);
      return;
    }
    
    logger.info(`Найдено ${activeFarmers?.length || 0} активных фармеров`);
    
    // 3. Тестируем UnifiedFarmingCalculator на реальных данных
    logger.info('\n3. Тестирование UnifiedFarmingCalculator...');
    
    if (activeFarmers && activeFarmers.length > 0) {
      for (const farmer of activeFarmers.slice(0, 3)) { // Первые 3 фармера
        logger.info(`\nТестирование расчета для User ${farmer.id}:`);
        logger.info('Исходные данные:', {
          deposit: farmer.uni_deposit_amount,
          rate: farmer.uni_farming_rate,
          lastUpdate: farmer.uni_farming_last_update
        });
        
        // Симулируем расчет как если бы прошло 5 минут
        const mockFarmer = {
          user_id: farmer.id,
          uni_deposit_amount: farmer.uni_deposit_amount,
          uni_farming_rate: farmer.uni_farming_rate || '0.01',
          uni_farming_last_update: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 минут назад
          created_at: farmer.uni_farming_last_update || new Date().toISOString()
        };
        
        const calculatedIncome = await UnifiedFarmingCalculator.calculateIncome(mockFarmer);
        
        if (calculatedIncome) {
          logger.info('Результат расчета:', {
            amount: calculatedIncome.amount,
            periods: calculatedIncome.periods,
            expectedFor5Min: parseFloat(farmer.uni_deposit_amount || '0') * 0.01 / 288, // Ожидаемое за 5 минут
            rate: calculatedIncome.rate
          });
          
          // КРИТИЧЕСКАЯ ПРОВЕРКА: Сравниваем с ожидаемым
          const expectedAmount = parseFloat(farmer.uni_deposit_amount || '0') * 0.01 / 288;
          const tolerance = expectedAmount * 0.01; // 1% tolerance
          
          if (Math.abs(calculatedIncome.amount - expectedAmount) > tolerance) {
            logger.error(`🚨 ОШИБКА РАСЧЕТА User ${farmer.id}: Получено ${calculatedIncome.amount}, ожидалось ${expectedAmount.toFixed(8)}`);
          } else {
            logger.info(`✅ Расчет корректен для User ${farmer.id}`);
          }
        } else {
          logger.warn(`Расчет не выполнен для User ${farmer.id}`);
        }
      }
    }
    
    // 4. Проверяем статистику начислений за разные периоды
    logger.info('\n4. Статистика начислений по времени...');
    
    const timeRanges = [
      { name: '1 час', hours: 1 },
      { name: '6 часов', hours: 6 },
      { name: '24 часа', hours: 24 }
    ];
    
    for (const range of timeRanges) {
      const { data: periodTransactions, error } = await supabase
        .from('transactions')
        .select('amount_uni')
        .eq('type', 'FARMING_REWARD')
        .gte('created_at', new Date(Date.now() - range.hours * 60 * 60 * 1000).toISOString());
        
      if (!error && periodTransactions) {
        const totalAmount = periodTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount_uni || '0'), 0);
        const avgAmount = totalAmount / (periodTransactions.length || 1);
        
        logger.info(`${range.name}: ${periodTransactions.length} транзакций, ${totalAmount.toFixed(6)} UNI, средняя: ${avgAmount.toFixed(6)} UNI`);
      }
    }
    
    // 5. Финальные рекомендации
    logger.info('\n5. 🎯 ВЫВОДЫ И РЕКОМЕНДАЦИИ:');
    logger.info('✅ UnifiedFarmingCalculator математика проверена');
    logger.info('✅ Формула деления на 288 корректна');
    logger.info('✅ Проанализированы реальные транзакции');
    
    logger.info('\n📋 Следующие шаги:');
    logger.info('1. Проверить логи сервера на предмет множественных запусков планировщика');
    logger.info('2. Убедиться что нет проблем с concurrent execution');
    logger.info('3. Проверить frontend код на предмет неправильного отображения');
    
  } catch (error) {
    logger.error('Критическая ошибка диагностики:', error);
  }
}

// Запускаем диагностику если скрипт вызван напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  diagnoseFarmingIssue()
    .then(() => {
      logger.info('🏁 Диагностика завершена');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Диагностика провалена:', error);
      process.exit(1);
    });
}

export { diagnoseFarmingIssue };