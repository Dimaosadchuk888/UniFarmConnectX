/**
 * TON Boost Income Scheduler - Исправленная версия для T57 тестирования
 * Начисляет доход от TON Boost и распределяет реферальные награды
 */

import { logger } from '../../core/logger';
import { supabase } from '../../core/supabase';
import { ReferralService } from '../referral/service';
import { BalanceNotificationService } from '../../core/BalanceNotificationService';
import { BalanceManager } from '../../core/BalanceManager';

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

    logger.info('[TON_BOOST_SCHEDULER] 🚀 Запуск планировщика доходов от TON Boost пакетов');

    // Первый запуск сразу
    logger.info('[TON_BOOST_SCHEDULER] 🔄 Запуск первого начисления TON Boost сразу при старте');
    this.processTonBoostIncome()
      .then(() => logger.info('[TON_BOOST_SCHEDULER] ✅ Первое начисление TON Boost выполнено'))
      .catch(error => logger.error('[TON_BOOST_SCHEDULER] ❌ Ошибка первого начисления:', error));

    // Затем каждые 5 минут
    this.intervalId = setInterval(() => {
      logger.info('[TON_BOOST_SCHEDULER] ⏰ Запуск периодического начисления TON Boost');
      this.processTonBoostIncome()
        .then(() => logger.info('[TON_BOOST_SCHEDULER] ✅ Периодическое начисление выполнено'))
        .catch(error => logger.error('[TON_BOOST_SCHEDULER] ❌ Ошибка периодического начисления:', error));
    }, 5 * 60 * 1000); // 5 минут

    logger.info('[TON_BOOST_SCHEDULER] ✅ Планировщик TON Boost доходов активен (каждые 5 минут)');
  }

  /**
   * Обрабатывает автоматическое начисление дохода от активных TON Boost пакетов
   */
  async processTonBoostIncome(): Promise<void> {
    try {
      logger.info('[TON_BOOST_SCHEDULER] Начало цикла обработки TON Boost доходов');

      // Получаем пользователей с активными TON Boost пакетами
      // Используем существующие поля: ton_boost_package (не null) и balance_ton (> 10 как депозит)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .not('ton_boost_package', 'is', null)
        .gte('balance_ton', 10); // Минимальный баланс TON для активного Boost

      if (usersError) {
        logger.error('[TON_BOOST_SCHEDULER] Ошибка получения пользователей:', usersError);
        return;
      }

      // Фильтруем активных TON Boost пользователей по существующим полям
      const activeBoostUsers = users?.filter(user => 
        user.ton_boost_package && 
        user.ton_boost_package !== 0 &&
        user.ton_boost_package !== '0' &&
        parseFloat(user.balance_ton || '0') >= 10
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
          let dailyRate = user.ton_boost_rate || 0.01; // Используем ton_boost_rate из базы данных
          // Используем баланс TON как депозит (минус 10 TON базовый баланс)
          const userDeposit = Math.max(0, parseFloat(user.balance_ton || '0') - 10);
          
          // Дополнительная проверка по ID пакета (для совместимости)
          switch (parseInt(user.ton_boost_package)) {
            case 1: // Starter Boost
              dailyRate = user.ton_boost_rate || 0.01;
              break;
            case 2: // Standard Boost  
              dailyRate = user.ton_boost_rate || 0.015;
              break;
            case 3: // Advanced Boost
              dailyRate = user.ton_boost_rate || 0.02;
              break;
            case 4: // Premium Boost
              dailyRate = user.ton_boost_rate || 0.025;
              break;
            case 5: // Elite Boost
              dailyRate = user.ton_boost_rate || 0.03;
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
          // Обновляем баланс через BalanceManager
          const addBalanceResult = await BalanceManager.addBalance(
            user.id,
            0,
            fiveMinuteIncome,
            'TON Boost income'
          );

          if (!addBalanceResult.success) {
            logger.error(`[TON_BOOST_SCHEDULER] Ошибка обновления баланса User ${user.id}:`, addBalanceResult.error);
            continue;
          }

          const userNewBalance = userCurrentBalance + fiveMinuteIncome;

          // Создаем транзакцию через унифицированный сервис
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
              user_id: user.id,
              type: 'FARMING_REWARD',  // Используем поддерживаемый тип
              amount_uni: '0',
              amount_ton: fiveMinuteIncome.toFixed(8),
              status: 'completed',
              description: `TON Boost доход (${user.ton_boost_package}): ${fiveMinuteIncome.toFixed(6)} TON`
            });

          if (transactionError) {
            logger.error(`[TON_BOOST_SCHEDULER] Ошибка создания транзакции User ${user.id}:`, transactionError);
            continue;
          }

          // Отправляем WebSocket уведомление об обновлении баланса
          const balanceService = BalanceNotificationService.getInstance();
          balanceService.notifyBalanceUpdate({
            userId: user.id,
            balanceUni: parseFloat(user.balance_uni || '0'),
            balanceTon: userNewBalance,
            changeAmount: fiveMinuteIncome,
            currency: 'TON',
            source: 'boost_income',
            timestamp: new Date().toISOString()
          });

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
          logger.error(`[TON_BOOST_SCHEDULER] Ошибка обработки TON Boost пользователя ${user.id}:`, {
            error: boostError instanceof Error ? boostError.message : String(boostError),
            stack: boostError instanceof Error ? boostError.stack : undefined,
            userId: user.id,
            packageId: user.ton_boost_package,
            deposit: userDeposit
          });
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