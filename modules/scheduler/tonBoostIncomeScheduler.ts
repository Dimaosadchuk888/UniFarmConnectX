/**
 * TON Boost Income Scheduler for UniFarm
 * Автоматически начисляет доход от активных Boost-пакетов каждые 5 минут
 * и распределяет реферальные награды от полученного дохода
 */

import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger';

export class TonBoostIncomeScheduler {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Запускает автоматическое начисление дохода от TON Boost каждые 5 минут
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[TON_BOOST_SCHEDULER] Планировщик уже запущен');
      return;
    }

    this.isRunning = true;
    
    // Запускаем первый раз сразу
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
      logger.info('[TON_BOOST_SCHEDULER] Начало обработки доходов от TON Boost пакетов');

      // Получаем всех пользователей с активными Boost-пакетами
      const { data: activeBoosts, error } = await supabase
        .from('boost_purchases')
        .select(`
          id,
          user_id,
          package_id,
          start_date,
          end_date,
          is_active,
          boost_packages!inner(
            id,
            name,
            daily_rate,
            duration_days,
            min_amount
          )
        `)
        .eq('status', 'confirmed')
        .eq('is_active', true)
        .lt('start_date', new Date().toISOString())
        .gt('end_date', new Date().toISOString());

      if (error) {
        logger.error('[TON_BOOST_SCHEDULER] Ошибка получения активных Boost пакетов:', error);
        return;
      }

      if (!activeBoosts || activeBoosts.length === 0) {
        logger.info('[TON_BOOST_SCHEDULER] Нет активных Boost пакетов для обработки');
        return;
      }

      logger.info(`[TON_BOOST_SCHEDULER] Найдено ${activeBoosts.length} активных Boost пакетов`);

      // Обрабатываем каждый активный Boost
      for (const boost of activeBoosts) {
        try {
          const income = await this.calculateBoostIncome(boost);
          
          if (parseFloat(income) > 0) {
            // Получаем текущий баланс пользователя
            const { data: user, error: userError } = await supabase
              .from('users')
              .select('balance_ton')
              .eq('id', boost.user_id)
              .single();

            if (userError || !user) {
              logger.error(`[TON_BOOST_SCHEDULER] Пользователь ${boost.user_id} не найден`);
              continue;
            }

            // Обновляем баланс пользователя
            const newBalance = parseFloat(user.balance_ton || '0') + parseFloat(income);
            const { error: updateError } = await supabase
              .from('users')
              .update({
                balance_ton: newBalance.toString(),
                last_active: new Date().toISOString()
              })
              .eq('id', boost.user_id);

            if (!updateError) {
              // Создаем транзакцию о доходе от Boost
              const { error: txError } = await supabase
                .from('transactions')
                .insert({
                  user_id: boost.user_id,
                  type: 'TON_BOOST_INCOME',
                  amount_ton: parseFloat(income),
                  amount_uni: 0,
                  currency: 'TON',
                  status: 'completed',
                  description: `Доход от TON Boost пакета "${boost.boost_packages?.name || 'Unknown'}"`,
                  source_user_id: boost.user_id,
                  created_at: new Date().toISOString()
                });

              if (!txError) {
                logger.info(`[TON_BOOST_SCHEDULER] Доход от TON Boost начислен пользователю ${boost.user_id}`, {
                  userId: boost.user_id,
                  amount: income,
                  currency: 'TON',
                  boostPackageId: boost.package_id,
                  boostPackageName: boost.boost_packages?.name || 'Unknown'
                });

                // Распределяем реферальные награды от дохода TON Boost
                try {
                  const { ReferralService } = await import('../referral/service');
                  const referralService = new ReferralService();
                  const referralResult = await referralService.distributeReferralRewards(
                    boost.user_id.toString(),
                    income,
                    'boost_income',
                    'TON'
                  );

                  if (referralResult.distributed > 0) {
                    logger.info(`[TON_BOOST_SCHEDULER] Реферальные награды распределены для TON Boost дохода`, {
                      userId: boost.user_id,
                      income,
                      distributed: referralResult.distributed,
                      totalAmount: referralResult.totalAmount,
                      boostPackageName: boost.boost_packages?.name || 'Unknown'
                    });
                  }
                } catch (referralError) {
                  logger.error(`[TON_BOOST_SCHEDULER] Ошибка распределения реферальных наград TON Boost`, {
                    userId: boost.user_id,
                    income,
                    error: referralError instanceof Error ? referralError.message : String(referralError)
                  });
                }
              } else {
                logger.error(`[TON_BOOST_SCHEDULER] Ошибка создания транзакции дохода для пользователя ${boost.user_id}:`, txError);
              }
            } else {
              logger.error(`[TON_BOOST_SCHEDULER] Ошибка обновления баланса пользователя ${boost.user_id}:`, updateError);
            }
          }
        } catch (error) {
          logger.error(`[TON_BOOST_SCHEDULER] Ошибка обработки Boost ${boost.id}:`, error instanceof Error ? error.message : String(error));
        }
      }
    } catch (error) {
      logger.error('[TON_BOOST_SCHEDULER] Ошибка обработки автоматического начисления TON Boost доходов:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Рассчитывает доход от TON Boost пакета за 5 минут
   */
  private async calculateBoostIncome(boost: any): Promise<string> {
    try {
      if (!boost.boost_packages) {
        logger.warn(`[TON_BOOST_SCHEDULER] Отсутствуют данные пакета для Boost ${boost.id}`);
        return '0';
      }

      const dailyRate = parseFloat(boost.boost_packages.daily_rate || '0');
      const minAmount = parseFloat(boost.boost_packages.min_amount || '0');
      
      if (dailyRate <= 0) {
        return '0';
      }

      // Рассчитываем доход за 5 минут
      // Формула: (daily_rate / 100) * min_amount * (5 минут / 1440 минут в сутках)
      const fiveMinuteRate = dailyRate / 100 * (5 / 1440); // 5 минут из 1440 минут в сутках
      const income = minAmount * fiveMinuteRate;

      logger.debug(`[TON_BOOST_SCHEDULER] Расчет дохода Boost ${boost.id}`, {
        dailyRate,
        minAmount,
        fiveMinuteRate,
        income
      });

      return income.toFixed(8); // 8 знаков после запятой для точности
    } catch (error) {
      logger.error(`[TON_BOOST_SCHEDULER] Ошибка расчета дохода для Boost ${boost.id}:`, error);
      return '0';
    }
  }

  /**
   * Останавливает планировщик TON Boost доходов
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('[TON_BOOST_SCHEDULER] Планировщик TON Boost доходов остановлен');
  }

  /**
   * Проверяет статус планировщика
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Экспортируем экземпляр планировщика
export const tonBoostIncomeScheduler = new TonBoostIncomeScheduler();