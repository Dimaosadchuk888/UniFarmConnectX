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
  private async processTonBoostIncome(): Promise<void> {
    try {
      logger.info('[TON_BOOST_SCHEDULER] Поиск активных TON Boost пакетов');

      // Ищем активные boost пакеты
      const { data: activeBoosts, error } = await supabase
        .from('boost_purchases')
        .select('user_id, boost_id, daily_rate, amount, total_earned, start_date, end_date')
        .eq('status', 'confirmed')
        .eq('is_active', true)
        .gt('end_date', new Date().toISOString()); // Только не истекшие

      if (error) {
        logger.error('[TON_BOOST_SCHEDULER] Ошибка получения boost пакетов:', error);
        return;
      }

      if (!activeBoosts || activeBoosts.length === 0) {
        logger.info('[TON_BOOST_SCHEDULER] Нет активных TON Boost пакетов');
        return;
      }

      logger.info(`[TON_BOOST_SCHEDULER] Найдено ${activeBoosts.length} активных boost пакетов`);

      // Обрабатываем каждый boost пакет
      for (const boost of activeBoosts) {
        try {
          // Рассчитываем доход согласно новой модели (процент от депозита)
          const dailyRatePercent = parseFloat(boost.daily_rate || '0'); // процент в день (например, 0.01 = 1%)
          const depositAmount = parseFloat(boost.amount || '0'); // сумма депозита
          
          // Ежедневный доход = депозит * процент
          const dailyIncome = depositAmount * dailyRatePercent;
          
          // Доход за 5 минут = дневной доход / 288 (288 циклов по 5 минут в день)
          const fiveMinuteIncome = dailyIncome / 288;

          if (fiveMinuteIncome <= 0) {
            continue;
          }

          logger.info(`[TON_BOOST_SCHEDULER] Boost ${boost.boost_id} пользователя ${boost.user_id}: доход ${fiveMinuteIncome.toFixed(8)} TON`);

          // Получаем текущий баланс пользователя
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('balance_ton')
            .eq('id', boost.user_id)
            .single();

          if (userError || !user) {
            logger.error(`[TON_BOOST_SCHEDULER] Пользователь ${boost.user_id} не найден:`, userError);
            continue;
          }

          // Обновляем баланс пользователя
          const currentBalance = parseFloat(user.balance_ton || '0');
          const newBalance = currentBalance + fiveMinuteIncome;

          const { error: updateError } = await supabase
            .from('users')
            .update({
              balance_ton: newBalance.toFixed(8),
              last_active: new Date().toISOString()
            })
            .eq('id', boost.user_id);

          if (updateError) {
            logger.error(`[TON_BOOST_SCHEDULER] Ошибка обновления баланса пользователя ${boost.user_id}:`, updateError);
            continue;
          }

          // Обновляем total_earned в boost_purchases
          const newTotalEarned = parseFloat(boost.total_earned || '0') + fiveMinuteIncome;
          await supabase
            .from('boost_purchases')
            .update({ total_earned: newTotalEarned.toFixed(8) })
            .eq('user_id', boost.user_id)
            .eq('boost_id', boost.boost_id);

          // Создаем транзакцию TON_BOOST_INCOME
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
              user_id: boost.user_id,
              type: 'TON_BOOST_INCOME',
              amount_ton: fiveMinuteIncome.toFixed(8),
              amount_uni: '0',
              currency: 'TON',
              status: 'completed',
              description: `Доход от TON Boost ${boost.boost_id}: ${fiveMinuteIncome.toFixed(6)} TON`,
              source_user_id: boost.user_id,
              created_at: new Date().toISOString()
            });

          if (transactionError) {
            logger.error(`[TON_BOOST_SCHEDULER] Ошибка создания транзакции для пользователя ${boost.user_id}:`, transactionError);
            continue;
          }

          logger.info(`[TON_BOOST_SCHEDULER] Доход ${fiveMinuteIncome.toFixed(6)} TON начислен пользователю ${boost.user_id}`);

          // Распределяем реферальные награды от фактического дохода
          await this.referralService.distributeReferralRewards(
            boost.user_id,
            fiveMinuteIncome.toFixed(8),
            'TON',
            'boost'
          );

          logger.info(`[TON_BOOST_SCHEDULER] Реферальные награды распределены для TON Boost дохода пользователя ${boost.user_id}`);

        } catch (boostError) {
          logger.error(`[TON_BOOST_SCHEDULER] Ошибка обработки boost пакета ${boost.boost_id}:`, boostError);
        }
      }

      logger.info(`[TON_BOOST_SCHEDULER] Завершена обработка доходов для ${activeBoosts.length} boost пакетов`);

    } catch (error) {
      logger.error('[TON_BOOST_SCHEDULER] Критическая ошибка планировщика TON Boost:', error);
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