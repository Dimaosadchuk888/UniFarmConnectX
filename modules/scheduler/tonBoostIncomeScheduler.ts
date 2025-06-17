/**
 * TON Boost Income Scheduler - Исправленная версия для T57 тестирования
 * Начисляет доход от TON Boost и распределяет реферальные награды
 */

import { logger } from '../../core/logger';
import { supabase } from '../../core/supabase';
import { ReferralService } from '../referral/service';

export class TONBoostIncomeScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private referralService: ReferralService;

  constructor() {
    this.referralService = new ReferralService();
  }

  /**
   * Запускает планировщик TON Boost доходов
   */
  start(): void {
    if (this.intervalId) {
      logger.warn('[TON_BOOST_SCHEDULER] Планировщик уже запущен');
      return;
    }

    logger.info('[TON_BOOST_SCHEDULER] Начало обработки доходов от TON Boost пакетов');

    // Первый запуск сразу
    this.processTonBoostIncome();

    // Затем каждые 5 минут
    this.intervalId = setInterval(() => {
      this.processTonBoostIncome();
    }, 5 * 60 * 1000); // 5 минут

    logger.info('[TON_BOOST_SCHEDULER] ✅ Планировщик TON Boost доходов активен (каждые 5 минут)');
  }

  /**
   * Обрабатывает автоматическое начисление дохода от активных TON Boost пакетов
   */
  async processTonBoostIncome(): Promise<void> {
    try {
      logger.info('[TON_BOOST_SCHEDULER] Начало цикла обработки TON Boost доходов');

      // Получаем активные TON Boost покупки
      const { data: activeBoosts, error: boostError } = await supabase
        .from('boost_purchases')
        .select('user_id, boost_id, total_earned, start_date, end_date')
        .eq('status', 'confirmed')
        .eq('is_active', true)
        .lt('start_date', new Date().toISOString())
        .gt('end_date', new Date().toISOString());

      if (boostError) {
        logger.error('[TON_BOOST_SCHEDULER] Ошибка получения активных boost пакетов:', boostError);
        return;
      }

      if (!activeBoosts || activeBoosts.length === 0) {
        logger.info('[TON_BOOST_SCHEDULER] ✅ Цикл завершен: 0 пользователей, 0.000000 TON начислено');
        return;
      }

      logger.info(`[TON_BOOST_SCHEDULER] Найдено ${activeBoosts.length} активных TON Boost пакетов`);

      let totalProcessed = 0;
      let totalEarned = 0;

      // Обрабатываем каждый активный boost пакет
      for (const boostPackage of activeBoosts) {
        try {
          // Определяем параметры boost пакета
          let dailyRate = 0.01; // 1% по умолчанию
          let estimatedDeposit = 100; // 100 TON по умолчанию
          
          switch (boostPackage.boost_id) {
            case 1: // Starter
              dailyRate = 0.01;
              estimatedDeposit = 100;
              break;
            case 2: // Standard
              dailyRate = 0.015;
              estimatedDeposit = 200;
              break;
            case 3: // Advanced
              dailyRate = 0.02;
              estimatedDeposit = 500;
              break;
            case 4: // Premium
              dailyRate = 0.025;
              estimatedDeposit = 1000;
              break;
            case 5: // Elite
              dailyRate = 0.03;
              estimatedDeposit = 2000;
              break;
          }
          
          // Расчет дохода за 5 минут
          const dailyIncome = estimatedDeposit * dailyRate;
          const fiveMinuteIncome = dailyIncome / 288; // 288 циклов по 5 минут в день

          if (fiveMinuteIncome <= 0.0001) {
            continue;
          }

          // Получаем пользователя
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('balance_ton')
            .eq('id', boostPackage.user_id)
            .single();

          if (userError || !userData) {
            logger.error(`[TON_BOOST_SCHEDULER] Пользователь ${boostPackage.user_id} не найден:`, userError);
            continue;
          }

          logger.info(`[TON_BOOST_SCHEDULER] User ${boostPackage.user_id} (Boost ${boostPackage.boost_id}): +${fiveMinuteIncome.toFixed(6)} TON`);

          // Обновляем баланс пользователя
          const userCurrentBalance = parseFloat(userData.balance_ton || '0');
          const userNewBalance = userCurrentBalance + fiveMinuteIncome;

          const { error: updateError } = await supabase
            .from('users')
            .update({
              balance_ton: userNewBalance.toFixed(8),
              last_active: new Date().toISOString()
            })
            .eq('id', boostPackage.user_id);

          if (updateError) {
            logger.error(`[TON_BOOST_SCHEDULER] Ошибка обновления баланса User ${boostPackage.user_id}:`, updateError);
            continue;
          }

          // Обновляем total_earned в boost_purchases
          const newTotalEarned = parseFloat(boostPackage.total_earned || '0') + fiveMinuteIncome;
          await supabase
            .from('boost_purchases')
            .update({ total_earned: newTotalEarned.toFixed(8) })
            .eq('user_id', boostPackage.user_id)
            .eq('boost_id', boostPackage.boost_id);

          // Создаем транзакцию
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
              user_id: boostPackage.user_id,
              type: 'ton_boost_reward',
              amount_uni: '0',
              amount_ton: fiveMinuteIncome.toFixed(8),
              status: 'completed',
              description: `Доход от TON Boost ${boostPackage.boost_id}: ${fiveMinuteIncome.toFixed(6)} TON`
            });

          if (transactionError) {
            logger.error(`[TON_BOOST_SCHEDULER] Ошибка создания транзакции User ${boostPackage.user_id}:`, transactionError);
            continue;
          }

          // Распределяем реферальные награды
          try {
            await this.referralService.distributeReferralRewards(
              boostPackage.user_id,
              fiveMinuteIncome.toFixed(8),
              'TON',
              'boost'
            );
          } catch (referralError) {
            logger.error(`[TON_BOOST_SCHEDULER] Ошибка реферальных наград User ${boostPackage.user_id}:`, referralError);
          }

          totalProcessed++;
          totalEarned += fiveMinuteIncome;

        } catch (boostError) {
          logger.error(`[TON_BOOST_SCHEDULER] Ошибка обработки boost пакета ${boostPackage.boost_id} пользователя ${boostPackage.user_id}:`, boostError);
        }
      }

      logger.info(`[TON_BOOST_SCHEDULER] ✅ Цикл завершен: ${totalProcessed} пользователей, ${totalEarned.toFixed(6)} TON начислено`);

    } catch (error) {
      logger.error('[TON_BOOST_SCHEDULER] Критическая ошибка планировщика:', error);
    }
  }

  /**
   * Останавливает планировщик
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('[TON_BOOST_SCHEDULER] ✅ Планировщик TON Boost остановлен');
    }
  }

  /**
   * Получает статус планировщика
   */
  getStatus(): { active: boolean; nextRun: Date | null } {
    return {
      active: this.intervalId !== null,
      nextRun: this.intervalId ? new Date(Date.now() + 5 * 60 * 1000) : null
    };
  }
}

export const tonBoostIncomeScheduler = new TONBoostIncomeScheduler();