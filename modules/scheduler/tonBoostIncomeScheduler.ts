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
   * Адаптированная версия для работы с пользователями с высокими TON балансами
   */
  private async processTonBoostIncome(): Promise<void> {
    try {
      logger.info('[TON_BOOST_SCHEDULER] Поиск пользователей с TON Boost активностью');

      // Ищем пользователей с высокими TON балансами (индикатор boost активности)
      const { data: potentialBoostUsers, error } = await supabase
        .from('users')
        .select('id, telegram_id, balance_ton')
        .gte('balance_ton', 50) // Пользователи с TON >= 50 считаются boost участниками
        .order('balance_ton', { ascending: false })
        .limit(20);

      if (error) {
        logger.error('[TON_BOOST_SCHEDULER] Ошибка получения пользователей:', error);
        return;
      }

      if (!potentialBoostUsers || potentialBoostUsers.length === 0) {
        logger.info('[TON_BOOST_SCHEDULER] Нет пользователей с TON Boost активностью');
        return;
      }

      logger.info(`[TON_BOOST_SCHEDULER] Найдено ${potentialBoostUsers.length} пользователей с TON Boost потенциалом`);

      // Обрабатываем каждого пользователя как boost участника
      for (const user of potentialBoostUsers) {
        try {
          // Определяем boost параметры на основе баланса TON
          const currentBalance = parseFloat(user.balance_ton || '0');
          
          // Логика boost пакетов T71: чем больше баланс, тем выше ставка
          let dailyRate = 0.01; // 1% базовая ставка
          let boostId = 1;
          
          if (currentBalance >= 200) {
            dailyRate = 0.02; // 2% для Advanced
            boostId = 3;
          } else if (currentBalance >= 100) {
            dailyRate = 0.015; // 1.5% для Standard  
            boostId = 2;
          }
          
          // Считаем депозит как 50% от текущего баланса (остальное - накопленный доход)
          const estimatedDeposit = currentBalance * 0.5;
          
          // Ежедневный доход = депозит * процент
          const dailyIncome = estimatedDeposit * dailyRate;
          
          // Доход за 5 минут = дневной доход / 288 (288 циклов по 5 минут в день)
          const fiveMinuteIncome = dailyIncome / 288;

          if (fiveMinuteIncome <= 0.0001) { // Минимальный порог
            continue;
          }

          logger.info(`[TON_BOOST_SCHEDULER] Boost ${boostId} пользователя ${user.id}: доход ${fiveMinuteIncome.toFixed(8)} TON`);

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