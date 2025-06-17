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

      // Получаем пользователей с активными TON Boost пакетами из users таблицы
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .not('ton_boost_package', 'is', null)
        .gt('ton_boost_deposit_amount', 0)
        .gte('ton_boost_package_expires_at', new Date().toISOString());

      if (usersError) {
        logger.error('[TON_BOOST_SCHEDULER] Ошибка получения пользователей:', usersError);
        return;
      }

      // Фильтруем активных TON Boost пользователей
      const activeBoostUsers = users?.filter(user => 
        user.ton_boost_package && 
        user.ton_boost_deposit_amount > 0 &&
        new Date(user.ton_boost_package_expires_at) > new Date()
      ) || [];

      if (activeBoostUsers.length === 0) {
        logger.info('[TON_BOOST_SCHEDULER] ✅ Цикл завершен: 0 активных TON Boost пользователей');
        return;
      }

      logger.info(`[TON_BOOST_SCHEDULER] Найдено ${activeBoostUsers.length} активных TON Boost пользователей`);

      let totalProcessed = 0;
      let totalEarned = 0;

      // Обрабатываем каждого пользователя с активным TON Boost
      for (const user of activeBoostUsers) {
        try {
          // Определяем параметры boost пакета пользователя
          let dailyRate = 0.01; // 1% по умолчанию
          const userDeposit = user.ton_boost_deposit_amount || 0;
          
          switch (user.ton_boost_package) {
            case 'starter': // Starter
              dailyRate = 0.01;
              break;
            case 'standard': // Standard
              dailyRate = 0.015;
              break;
            case 'advanced': // Advanced
              dailyRate = 0.02;
              break;
            case 'premium': // Premium
              dailyRate = 0.025;
              break;
            case 'elite': // Elite
              dailyRate = 0.03;
              break;
          }
          
          // Расчет дохода за 5 минут на основе реального депозита
          const dailyIncome = userDeposit * dailyRate;
          const fiveMinuteIncome = dailyIncome / 288; // 288 циклов по 5 минут в день

          if (fiveMinuteIncome <= 0.0001) {
            continue;
          }

          logger.info(`[TON_BOOST_SCHEDULER] User ${user.id} (${user.ton_boost_package}): +${fiveMinuteIncome.toFixed(6)} TON`);

          // Обновляем баланс пользователя
          const userCurrentBalance = parseFloat(user.balance_ton || '0');
          const userNewBalance = userCurrentBalance + fiveMinuteIncome;

          const { error: updateError } = await supabase
            .from('users')
            .update({
              balance_ton: userNewBalance.toFixed(8),
              last_active: new Date().toISOString()
            })
            .eq('id', user.id);

          if (updateError) {
            logger.error(`[TON_BOOST_SCHEDULER] Ошибка обновления баланса User ${user.id}:`, updateError);
            continue;
          }

          // Создаем транзакцию
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
              user_id: user.id,
              type: 'FARMING_REWARD',
              amount_uni: '0',
              amount_ton: fiveMinuteIncome.toFixed(8),
              status: 'completed',
              description: `Доход от TON Boost ${user.ton_boost_package}: ${fiveMinuteIncome.toFixed(6)} TON`
            });

          if (transactionError) {
            logger.error(`[TON_BOOST_SCHEDULER] Ошибка создания транзакции User ${user.id}:`, transactionError);
            continue;
          }

          // Распределяем реферальные награды
          try {
            await this.referralService.distributeReferralRewards(
              user.id,
              fiveMinuteIncome.toFixed(8),
              'TON',
              'boost'
            );
          } catch (referralError) {
            logger.error(`[TON_BOOST_SCHEDULER] Ошибка реферальных наград User ${user.id}:`, referralError);
          }

          totalProcessed++;
          totalEarned += fiveMinuteIncome;

        } catch (boostError) {
          logger.error(`[TON_BOOST_SCHEDULER] Ошибка обработки TON Boost пользователя ${user.id}:`, boostError);
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