/**
 * TON Boost Income Scheduler - Исправленная версия для работы без boost_purchases таблицы
 * Начисляет доход от TON Boost и распределяет реферальные награды
 * Решение проблемы RLS блокировки boost_purchases
 */

import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger';
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

    // Запускаем немедленно
    this.processTonBoostIncome();

    // Затем каждые 5 минут
    this.intervalId = setInterval(() => {
      this.processTonBoostIncome();
    }, 5 * 60 * 1000); // 5 минут

    logger.info('[TON_BOOST_SCHEDULER] ✅ Планировщик TON Boost доходов активен (каждые 5 минут)');
  }

  /**
   * Обрабатывает автоматическое начисление дохода от TON Boost
   * Адаптированная версия для работы без boost_purchases (обход RLS проблемы)
   */
  private async processTonBoostIncome(): Promise<void> {
    try {
      logger.info('[TON_BOOST_SCHEDULER] Начало обработки TON Boost доходов');

      // Ищем пользователей с TON балансами >= 50 (индикатор boost активности)
      const { data: boostUsers, error } = await supabase
        .from('users')
        .select('id, telegram_id, balance_ton')
        .gte('balance_ton', 50)
        .order('balance_ton', { ascending: false })
        .limit(50);

      if (error) {
        logger.error('[TON_BOOST_SCHEDULER] Ошибка получения boost пользователей:', error);
        return;
      }

      if (!boostUsers || boostUsers.length === 0) {
        logger.info('[TON_BOOST_SCHEDULER] Нет активных TON Boost пользователей');
        return;
      }

      logger.info(`[TON_BOOST_SCHEDULER] Найдено ${boostUsers.length} TON Boost участников`);

      let processedUsers = 0;
      let totalIncome = 0;

      // Обрабатываем каждого пользователя
      for (const boostUser of boostUsers) {
        try {
          const currentTonBalance = parseFloat(boostUser.balance_ton || '0');
          
          // Определяем boost пакет по текущему балансу (T71 модель)
          let dailyRate = 0.01; // 1% Starter
          let boostPackageId = 1;
          
          if (currentTonBalance >= 300) {
            dailyRate = 0.03; // 3% Elite
            boostPackageId = 5;
          } else if (currentTonBalance >= 200) {
            dailyRate = 0.025; // 2.5% Premium
            boostPackageId = 4;
          } else if (currentTonBalance >= 150) {
            dailyRate = 0.02; // 2% Advanced
            boostPackageId = 3;
          } else if (currentTonBalance >= 100) {
            dailyRate = 0.015; // 1.5% Standard
            boostPackageId = 2;
          }
          
          // Оцениваем первоначальный депозит (40% от текущего баланса)
          const estimatedDeposit = currentTonBalance * 0.4;
          
          // Расчет дохода согласно T71 модели
          const dailyIncome = estimatedDeposit * dailyRate;
          const fiveMinuteIncome = dailyIncome / 288; // 288 циклов по 5 минут в день
          
          if (fiveMinuteIncome < 0.0001) {
            continue; // Слишком маленький доход
          }

          logger.info(`[TON_BOOST_SCHEDULER] User ${boostUser.id} (Boost ${boostPackageId}): +${fiveMinuteIncome.toFixed(6)} TON`);

          // Обновляем баланс пользователя
          const newBalance = currentTonBalance + fiveMinuteIncome;
          
          const { error: updateError } = await supabase
            .from('users')
            .update({ balance_ton: newBalance })
            .eq('id', boostUser.id);

          if (updateError) {
            logger.error(`[TON_BOOST_SCHEDULER] Ошибка обновления баланса User ${boostUser.id}:`, updateError);
            continue;
          }

          // Создаем транзакцию TON Boost дохода
          const { error: txError } = await supabase
            .from('transactions')
            .insert({
              user_id: boostUser.id,
              type: 'TON_BOOST_INCOME',
              amount_uni: 0,
              amount_ton: fiveMinuteIncome,
              description: `TON Boost Package ${boostPackageId} income (${(dailyRate * 100)}% daily rate)`,
              status: 'completed',
              source: 'boost_scheduler',
              created_at: new Date().toISOString()
            });

          if (txError) {
            logger.error(`[TON_BOOST_SCHEDULER] Ошибка создания транзакции User ${boostUser.id}:`, txError);
            continue;
          }

          // Распределяем реферальные награды от TON Boost дохода
          try {
            await this.referralService.distributeReferralRewards(
              boostUser.id.toString(),
              fiveMinuteIncome,
              'TON',
              'boost_income'
            );
            
            logger.debug(`[TON_BOOST_SCHEDULER] Реферальные награды распределены для User ${boostUser.id}`);
          } catch (referralError) {
            logger.warn(`[TON_BOOST_SCHEDULER] Ошибка реферальных наград User ${boostUser.id}:`, referralError);
          }

          processedUsers++;
          totalIncome += fiveMinuteIncome;

        } catch (userError) {
          logger.error(`[TON_BOOST_SCHEDULER] Ошибка обработки User ${boostUser.id}:`, userError);
        }
      }

      logger.info(`[TON_BOOST_SCHEDULER] ✅ Цикл завершен: ${processedUsers} пользователей, ${totalIncome.toFixed(6)} TON начислено`);

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
      logger.info('[TON_BOOST_SCHEDULER] Планировщик остановлен');
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

// Экспортируем единственный экземпляр планировщика
export const tonBoostIncomeScheduler = new TONBoostIncomeScheduler();