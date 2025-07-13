/**
 * TON Boost Income Scheduler - Исправленная версия для T57 тестирования
 * Начисляет доход от TON Boost и распределяет реферальные награды
 */

import { logger } from '../../core/logger';
import { ReferralService } from '../referral/service';
import { BalanceNotificationService } from '../../core/balanceNotificationService';
import { BalanceManager } from '../../core/BalanceManager';
import { supabase } from '../../core/supabase';

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

      // Получаем пользователей с активными TON Boost пакетами через репозиторий
      const TonFarmingRepository = await import('../boost/TonFarmingRepository').then(m => m.TonFarmingRepository);
      const tonFarmingRepo = new TonFarmingRepository();
      
      // Получаем активных пользователей с boost
      const activeBoostUsers = await tonFarmingRepo.getActiveBoostUsers();
      
      if (!activeBoostUsers || activeBoostUsers.length === 0) {
        logger.info('[TON_BOOST_SCHEDULER] Нет активных пользователей с TON Boost');
        return;
      }

      logger.info(`[TON_BOOST_SCHEDULER] Найдено ${activeBoostUsers.length} активных TON Boost пользователей`);

      // Получаем балансы пользователей из таблицы users
      // Важно: user_id в ton_farming_data хранится как строка, а id в users как число
      const userIds = activeBoostUsers.map(u => parseInt(u.user_id.toString()));
      const { data: userBalances, error: balanceError } = await supabase
        .from('users')
        .select('id, balance_ton, balance_uni')
        .in('id', userIds);
      
      if (balanceError) {
        logger.error('[TON_BOOST_SCHEDULER] Ошибка получения балансов пользователей:', balanceError);
        return;
      }
      
      // Создаем мапу для быстрого доступа к балансам
      const balanceMap = new Map(userBalances?.map(u => [u.id, u]) || []);

      let totalProcessed = 0;
      let totalEarned = 0;

      // Обрабатываем каждого пользователя с активным TON Boost
      for (const user of activeBoostUsers) {
        try {
          // Получаем актуальные балансы пользователя
          // Конвертируем user_id в число для поиска в мапе
          const userId = parseInt(user.user_id.toString());
          const userBalance = balanceMap.get(userId);
          if (!userBalance) {
            logger.warn(`[TON_BOOST_SCHEDULER] Баланс не найден для пользователя ${user.user_id}`);
            continue;
          }
          
          // Логируем данные для диагностики
          logger.info(`[TON_BOOST_SCHEDULER] Обработка пользователя ${user.user_id}:`, {
            boost_data: {
              farming_balance: user.farming_balance,
              farming_rate: user.farming_rate,
              boost_package_id: user.boost_package_id,
              ton_boost_rate: user.ton_boost_rate
            },
            user_balances: {
              balance_ton: userBalance.balance_ton,
              balance_uni: userBalance.balance_uni
            }
          });
          
          // Определяем параметры boost пакета пользователя
          let dailyRate = user.ton_boost_rate || 0.01; // Используем ton_boost_rate из базы данных
          // Используем баланс TON как депозит (минус 10 TON базовый баланс)
          const userDeposit = Math.max(0, parseFloat(userBalance.balance_ton || '0') - 10);
          
          // Дополнительная проверка по ID пакета (для совместимости)
          switch (parseInt(user.boost_package_id)) {
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

          logger.info(`[TON_BOOST_SCHEDULER] User ${user.user_id} (${user.boost_package_id}): +${fiveMinuteIncome.toFixed(6)} TON`);

          // Обновляем баланс пользователя
          const userCurrentBalance = parseFloat(userBalance.balance_ton || '0');
          // Обновляем баланс через BalanceManager
          const addBalanceResult = await BalanceManager.addBalance(
            userId,  // Используем числовой ID
            0,
            fiveMinuteIncome,
            'TON Boost income'
          );

          if (!addBalanceResult.success) {
            logger.error(`[TON_BOOST_SCHEDULER] Ошибка обновления баланса User ${user.user_id}:`, addBalanceResult.error);
            continue;
          }

          const userNewBalance = userCurrentBalance + fiveMinuteIncome;

          // Создаем транзакцию через UnifiedTransactionService
          const { UnifiedTransactionService } = await import('../../core/TransactionService');
          const transactionService = UnifiedTransactionService.getInstance();
          
          const transactionResult = await transactionService.createTransaction({
            user_id: userId,  // Используем числовой ID
            type: 'TON_BOOST_INCOME',  // Используем специфичный тип (будет преобразован в FARMING_REWARD)
            amount_uni: 0,
            amount_ton: fiveMinuteIncome,
            currency: 'TON',
            status: 'completed',
            description: `TON Boost доход (пакет ${user.boost_package_id}): ${fiveMinuteIncome.toFixed(6)} TON`,
            metadata: {
              boost_package_id: user.boost_package_id,
              daily_rate: dailyRate,
              user_deposit: userDeposit
            }
          });

          if (!transactionResult.success) {
            logger.error(`[TON_BOOST_SCHEDULER] Ошибка создания транзакции User ${user.user_id}:`, transactionResult.error);
            continue;
          }

          // Отправляем WebSocket уведомление об обновлении баланса
          const balanceService = BalanceNotificationService.getInstance();
          balanceService.notifyBalanceUpdate({
            userId: userId,  // Используем числовой ID
            balanceUni: parseFloat(userBalance.balance_uni || '0'),
            balanceTon: userNewBalance,
            changeAmount: fiveMinuteIncome,
            currency: 'TON',
            source: 'boost_income',
            timestamp: new Date().toISOString()
          });

          // Распределяем реферальные награды
          try {
            await this.referralService.distributeReferralRewards(
              userId,  // Используем числовой ID
              fiveMinuteIncome.toFixed(8),
              'TON',
              'boost'
            );
          } catch (referralError) {
            logger.error(`[TON_BOOST_SCHEDULER] Ошибка реферальных наград User ${user.user_id}:`, referralError);
          }

          totalProcessed++;
          totalEarned += fiveMinuteIncome;

        } catch (boostError) {
          logger.error(`[TON_BOOST_SCHEDULER] Ошибка обработки TON Boost пользователя ${user.user_id}:`, {
            error: boostError instanceof Error ? boostError.message : String(boostError),
            stack: boostError instanceof Error ? boostError.stack : undefined,
            userId: user.user_id,
            packageId: user.boost_package_id,
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