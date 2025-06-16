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
      logger.info('[TON_BOOST_SCHEDULER] Поиск пользователей с активными TON Boost');

      // Ищем пользователей с активными TON farming
      const { data: activeUsers, error } = await supabase
        .from('users')
        .select('id, telegram_id, balance_ton, ton_farming_rate, ton_farming_start_timestamp')
        .eq('ton_farming_start_timestamp::text', 'not null')
        .gt('ton_farming_rate', '0');

      if (error) {
        logger.error('[TON_BOOST_SCHEDULER] Ошибка получения пользователей с TON farming:', error);
        return;
      }

      if (!activeUsers || activeUsers.length === 0) {
        logger.info('[TON_BOOST_SCHEDULER] Нет пользователей с активным TON farming');
        return;
      }

      logger.info(`[TON_BOOST_SCHEDULER] Найдено ${activeUsers.length} пользователей с TON farming`);

      // Обрабатываем каждого пользователя
      for (const user of activeUsers) {
        try {
          // Рассчитываем доход как дополнительный Boost доход
          const baseRate = parseFloat(user.ton_farming_rate || '0');
          const boostMultiplier = 0.1; // 10% дополнительный доход от Boost
          const boostIncome = baseRate * boostMultiplier;

          if (boostIncome <= 0) {
            continue;
          }

          logger.info(`[TON_BOOST_SCHEDULER] Пользователь ${user.id}: Boost доход ${boostIncome.toFixed(8)} TON`);

          // Обновляем баланс пользователя
          const currentBalance = parseFloat(user.balance_ton || '0');
          const newBalance = currentBalance + boostIncome;

          const { error: updateError } = await supabase
            .from('users')
            .update({
              balance_ton: newBalance.toFixed(8),
              last_active: new Date().toISOString()
            })
            .eq('id', user.id);

          if (updateError) {
            logger.error(`[TON_BOOST_SCHEDULER] Ошибка обновления баланса пользователя ${user.id}:`, updateError);
            continue;
          }

          // Создаем транзакцию TON_BOOST_INCOME
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
              user_id: user.id,
              type: 'TON_BOOST_INCOME',
              amount_ton: boostIncome.toFixed(8),
              amount_uni: '0',
              currency: 'TON',
              status: 'completed',
              description: 'Доход от TON Boost пакета',
              source_user_id: user.id,
              created_at: new Date().toISOString()
            });

          if (transactionError) {
            logger.error(`[TON_BOOST_SCHEDULER] Ошибка создания транзакции для пользователя ${user.id}:`, transactionError);
            continue;
          }

          logger.info(`[TON_BOOST_SCHEDULER] Доход от TON Boost начислен пользователю ${user.id}`);

          // Распределяем реферальные награды от фактического дохода
          await this.referralService.distributeReferralRewards(
            user.id,
            boostIncome.toFixed(8),
            'boost_income',
            'TON'
          );

          logger.info(`[TON_BOOST_SCHEDULER] Реферальные награды распределены для TON Boost дохода пользователя ${user.id}`);

        } catch (userError) {
          logger.error(`[TON_BOOST_SCHEDULER] Ошибка обработки пользователя ${user.id}:`, userError);
        }
      }

      logger.info(`[TON_BOOST_SCHEDULER] Завершена обработка TON Boost доходов для ${activeUsers.length} пользователей`);

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