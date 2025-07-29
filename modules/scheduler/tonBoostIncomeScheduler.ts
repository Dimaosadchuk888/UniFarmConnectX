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
  private static instance: TONBoostIncomeScheduler | null = null;
  private isProcessing: boolean = false;
  private lastProcessTime: Date | null = null;
  
  // Singleton pattern to prevent multiple instances
  static getInstance(): TONBoostIncomeScheduler {
    if (!TONBoostIncomeScheduler.instance) {
      TONBoostIncomeScheduler.instance = new TONBoostIncomeScheduler();
    }
    return TONBoostIncomeScheduler.instance;
  }

  constructor() {
    this.referralService = new ReferralService();
  }

  /**
   * Запускает планировщик TON Boost доходов
   */
  start(): void {
    if (this.intervalId) {
      logger.warn('[TON_BOOST_SCHEDULER-PROTECTED] Планировщик уже запущен', {
        hasInterval: !!this.intervalId,
        isProcessing: this.isProcessing
      });
      return;
    }

    logger.info('[TON_BOOST_SCHEDULER-PROTECTED] 🚀 [EMERGENCY FIX] Запуск защищенного планировщика TON Boost');

    // CRITICAL FIX: Add protection against multiple executions
    this.intervalId = setInterval(async () => {
      const startTime = new Date();
      logger.info('[TON_BOOST_SCHEDULER-PROTECTED] ⏰ Запуск защищенного начисления TON Boost', {
        startTime: startTime.toISOString(),
        isProcessing: this.isProcessing,
        lastProcessTime: this.lastProcessTime?.toISOString()
      });
      
      // CRITICAL: Multiple level protection similar to UNI farming
      if (this.isProcessing) {
        logger.warn('[TON_BOOST_SCHEDULER-PROTECTED] 🚫 SKIP: Уже выполняется обработка');
        return;
      }
      
      // Additional time-based protection
      if (this.lastProcessTime) {
        const minutesSince = (Date.now() - this.lastProcessTime.getTime()) / (1000 * 60);
        if (minutesSince < 4.8) { // Same protection as UNI farming
          logger.warn('[TON_BOOST_SCHEDULER-PROTECTED] 🚫 SKIP: Слишком рано с последнего запуска', {
            minutesSince: minutesSince.toFixed(2),
            required: 4.8
          });
          return;
        }
      }
      
      this.isProcessing = true;
      this.lastProcessTime = new Date();
      
      try {
        await this.processTonBoostIncome();
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        logger.info('[TON_BOOST_SCHEDULER-PROTECTED] ✅ Защищенное начисление выполнено', {
          duration: `${duration}ms`,
          endTime: endTime.toISOString()
        });
      } catch (error) {
        logger.error('[TON_BOOST_SCHEDULER-PROTECTED] ❌ Ошибка защищенного начисления:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 5 * 60 * 1000); // 5 минут

    logger.info('[TON_BOOST_SCHEDULER-PROTECTED] ✅ [EMERGENCY FIX] Защищенный планировщик TON Boost активен (строго каждые 5 минут)');
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
      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: user_id в ton_farming_data хранится как строка, а id в users как число
      // Используем CAST для правильного приведения типов в SQL запросе
      const userIds = activeBoostUsers.map(u => {
        const numericId = parseInt(u.user_id.toString());
        if (isNaN(numericId)) {
          logger.warn(`[TON_BOOST_SCHEDULER] Некорректный user_id: ${u.user_id}`);
          return null;
        }
        return numericId;
      }).filter(id => id !== null);
      
      if (userIds.length === 0) {
        logger.warn('[TON_BOOST_SCHEDULER] Нет корректных пользователей для обработки');
        return;
      }
      
      logger.info(`[TON_BOOST_SCHEDULER] Преобразованные ID пользователей:`, {
        original: activeBoostUsers.map(u => u.user_id),
        converted: userIds
      });
      
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
          // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Конвертируем user_id из строки в число для поиска в мапе
          const userId = parseInt(user.user_id.toString());
          if (isNaN(userId)) {
            logger.warn(`[TON_BOOST_SCHEDULER] 🚫 SKIP: Некорректный user_id: ${user.user_id} - пропускаем`);
            continue;
          }
          
          const userBalance = balanceMap.get(userId);
          if (!userBalance) {
            logger.error(`[TON_BOOST_SCHEDULER] 🚫 CRITICAL: Баланс не найден для пользователя ${user.user_id} (ID: ${userId})`);
            logger.error(`[TON_BOOST_SCHEDULER] Доступные балансы в мапе:`, Array.from(balanceMap.keys()));
            logger.error(`[TON_BOOST_SCHEDULER] Пользователь из farming_data:`, {
              user_id: user.user_id,
              type: typeof user.user_id,
              converted_id: userId,
              boost_package_id: user.boost_package_id
            });
            continue;
          }
          
          logger.info(`[TON_BOOST_SCHEDULER] ✅ ОБРАБОТКА ПОЛЬЗОВАТЕЛЯ ${user.user_id}:`, {
            string_id: user.user_id,
            numeric_id: userId,
            found_balance: true,
            balance_ton: userBalance.balance_ton
          });
          
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
          // Используем farming_balance из ton_farming_data
          const userDeposit = Math.max(0, parseFloat(user.farming_balance || '0'));
          
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

          // Уменьшаем минимальный порог чтобы обрабатывать даже мелкие депозиты
          if (fiveMinuteIncome <= 0.00001) { // Было 0.0001, стало 0.00001
            logger.info(`[TON_BOOST_SCHEDULER] User ${user.user_id}: доход слишком мал (${fiveMinuteIncome.toFixed(8)} TON) - пропускаем`);
            continue;
          }

          logger.info(`[TON_BOOST_SCHEDULER] User ${user.user_id} (${user.boost_package_id}): +${fiveMinuteIncome.toFixed(6)} TON (депозит: ${userDeposit} TON)`);

          // Создаем транзакцию через UnifiedTransactionService
          const { UnifiedTransactionService } = await import('../../core/TransactionService');
          const transactionService = UnifiedTransactionService.getInstance();
          
          const transactionResult = await transactionService.createTransaction({
            user_id: userId,  // Используем числовой ID
            type: 'FARMING_REWARD',  // Используем существующий тип из БД
            amount_uni: 0,
            amount_ton: fiveMinuteIncome,
            currency: 'TON',
            status: 'completed',
            description: `TON Boost доход (пакет ${user.boost_package_id}): ${fiveMinuteIncome.toFixed(6)} TON`,
            metadata: {
              boost_package_id: user.boost_package_id,
              daily_rate: dailyRate,
              user_deposit: userDeposit,
              original_type: 'TON_BOOST_INCOME',  // Метка для различения TON Boost транзакций
              transaction_source: 'ton_boost_scheduler'
            }
          });

          if (!transactionResult.success) {
            logger.error(`[TON_BOOST_SCHEDULER] Ошибка создания транзакции User ${user.user_id}:`, transactionResult.error);
            continue;
          }

          // Отправляем WebSocket уведомление с ТЕКУЩИМИ балансами (не рассчитанными)
          // Это устраняет race condition - frontend получит актуальные балансы
          const balanceService = BalanceNotificationService.getInstance();
          balanceService.notifyBalanceUpdate({
            userId: userId,  // Используем числовой ID
            balanceUni: parseFloat(userBalance.balance_uni || '0'),  // Текущий баланс UNI
            balanceTon: parseFloat(userBalance.balance_ton || '0'),  // Текущий баланс TON (до обновления)
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