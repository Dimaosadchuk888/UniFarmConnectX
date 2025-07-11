/**
 * Автоматический планировщик начисления фарминг дохода для Supabase API
 * Периодически обновляет баланс пользователей без ручного клейма
 */

import cron from 'node-cron';
import { supabase } from '../supabase';
import { logger } from '../logger';
import { BalanceNotificationService } from '../balanceNotificationService';

export class FarmingScheduler {
  private isRunning: boolean = false;

  /**
   * Запускает автоматическое начисление фарминг дохода каждые 5 минут
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('FarmingScheduler уже запущен');
      return;
    }

    logger.info('🚀 Запуск автоматического планировщика фарминг дохода');
    
    // Каждые 5 минут начисляем доход активным фармерам
    cron.schedule('*/5 * * * *', async () => {
      logger.info('⏰ [CRON] Запуск scheduler задачи для начисления доходов');
      try {
        await this.processUniFarmingIncome();
        await this.processTonFarmingIncome();
        logger.info('✅ [CRON] Scheduler задача выполнена успешно');
      } catch (error) {
        logger.error('❌ [CRON] Ошибка выполнения scheduler задачи:', error);
      }
    });

    this.isRunning = true;
    logger.info('✅ Планировщик фарминг дохода активен (каждые 5 минут)');
    
    // Запускаем первое начисление сразу при старте (для тестирования)
    logger.info('🔄 Запуск первого начисления сразу при старте scheduler\'а');
    this.processUniFarmingIncome()
      .then(() => logger.info('✅ Первое начисление UNI farming выполнено'))
      .catch(error => logger.error('❌ Ошибка первого начисления UNI farming:', error));
      
    this.processTonFarmingIncome()
      .then(() => logger.info('✅ Первое начисление TON farming выполнено'))
      .catch(error => logger.error('❌ Ошибка первого начисления TON farming:', error));
  }

  /**
   * Обрабатывает автоматическое начисление UNI фарминг дохода
   */
  private async processUniFarmingIncome(): Promise<void> {
    try {
      logger.info('[UNI Farming] Начинаем обработку автоматического начисления дохода');

      // Находим всех активных UNI фармеров (с проверкой флага активности)
      const { data: activeFarmers, error } = await supabase
        .from('users')
        .select('*')
        .eq('uni_farming_active', true)  // Проверяем флаг активности
        .not('uni_farming_start_timestamp', 'is', null)
        .not('uni_farming_rate', 'is', null);

      if (error) {
        logger.error('[UNI Farming] Ошибка получения активных фармеров:', error.message);
        return;
      }

      logger.info(`[UNI Farming] Найдено ${activeFarmers?.length || 0} активных фармеров (с uni_farming_active=true)`);
      
      // Дополнительное логирование для отладки
      if (activeFarmers && activeFarmers.length > 0) {
        logger.info('[UNI Farming] Список активных фармеров:', {
          farmers: activeFarmers.map(f => ({
            id: f.id,
            telegram_id: f.telegram_id,
            uni_farming_active: f.uni_farming_active,
            deposit_amount: f.uni_deposit_amount,
            rate: f.uni_farming_rate
          }))
        });
      }

      for (const farmer of activeFarmers || []) {
        try {
          const income = await this.calculateUniFarmingIncome(farmer);
          
          if (parseFloat(income) > 0) {
            // Обновляем баланс пользователя через BalanceManager
            const balanceManager = await import('../../core/BalanceManager').then(m => m.default);
            const addBalanceResult = await balanceManager.addBalance(
              farmer.id,
              parseFloat(income),
              0,
              'UNI farming income'
            );

            if (addBalanceResult.success) {
              // Обновляем время последнего обновления фарминга
              await supabase
                .from('users')
                .update({
                  uni_farming_last_update: new Date().toISOString()
                })
                .eq('id', farmer.id);
            }

            const updateError = !addBalanceResult.success ? new Error(addBalanceResult.error || 'Balance update failed') : null;

            if (!updateError) {
              // Записываем сессию в farming_sessions
              await supabase
                .from('farming_sessions')
                .insert({
                  user_id: farmer.id,
                  session_type: 'UNI_FARMING',
                  amount_earned: parseFloat(income),
                  currency: 'UNI',
                  farming_rate: parseFloat(farmer.uni_farming_rate || '0'),
                  session_start: farmer.uni_farming_start_timestamp,
                  session_end: new Date().toISOString(),
                  status: 'completed',
                  created_at: new Date().toISOString()
                });

              // Создаем транзакцию FARMING_REWARD
              await supabase
                .from('transactions')
                .insert({
                  user_id: farmer.id,
                  type: 'FARMING_REWARD',
                  amount_uni: income,
                  amount_ton: '0',
                  status: 'completed',
                  description: `UNI farming income: ${parseFloat(income).toFixed(6)} UNI (rate: ${farmer.uni_farming_rate})`,
                  source_user_id: farmer.id,
                  created_at: new Date().toISOString()
                });

              logger.info(`[FARMING_SCHEDULER] Successfully processed UNI farming for user ${farmer.id}`, {
                userId: farmer.id,
                amount: income,
                currency: 'UNI'
              });

              // Отправляем WebSocket уведомление об обновлении баланса
              const balanceService = BalanceNotificationService.getInstance();
              balanceService.notifyBalanceUpdate({
                userId: farmer.id,
                balanceUni: parseFloat(farmer.balance_uni || '0') + parseFloat(income),
                balanceTon: parseFloat(farmer.balance_ton || '0'),
                changeAmount: parseFloat(income),
                currency: 'UNI',
                source: 'farming',
                timestamp: new Date().toISOString()
              });

              // Распределяем реферальные награды от UNI фарминга
              try {
                const { ReferralService } = await import('../../modules/referral/service');
                const referralService = new ReferralService();
                const referralResult = await referralService.distributeReferralRewards(
                  farmer.id.toString(),
                  income,
                  'UNI',
                  'farming'
                );

                if (referralResult.distributed > 0) {
                  logger.info(`[FARMING_SCHEDULER] Реферальные награды распределены для UNI фарминга`, {
                    farmerId: farmer.id,
                    income,
                    distributed: referralResult.distributed,
                    totalAmount: referralResult.totalAmount
                  });
                }
              } catch (referralError) {
                logger.error(`[FARMING_SCHEDULER] Ошибка распределения реферальных наград UNI`, {
                  farmerId: farmer.id,
                  income,
                  error: referralError instanceof Error ? referralError.message : String(referralError)
                });
              }
            }
          }
        } catch (error) {
          logger.error(`[UNI Farming] Error processing farmer ${farmer.id}:`, error instanceof Error ? error.message : String(error));
        }
      }
    } catch (error) {
      logger.error('[UNI Farming] Ошибка обработки автоматического начисления:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Обрабатывает автоматическое начисление TON фарминг дохода
   */
  private async processTonFarmingIncome(): Promise<void> {
    try {
      logger.info('[TON Farming] Начинаем обработку автоматического начисления дохода');

      // Находим всех активных TON фармеров
      const { data: activeFarmers, error } = await supabase
        .from('farming_sessions')
        .select('*, users(*)')
        .eq('farming_type', 'TON_FARMING')
        .eq('is_active', true);

      if (error) {
        logger.error('[TON Farming] Ошибка получения активных фармеров:', error.message);
        return;
      }

      logger.info(`[TON Farming] Найдено ${activeFarmers?.length || 0} активных сессий`);

      for (const session of activeFarmers || []) {
        try {
          const income = await this.calculateTonFarmingIncome(session);
          
          if (parseFloat(income) > 0) {
            // Обновляем баланс пользователя через BalanceManager
            const balanceManager = await import('../../core/BalanceManager').then(m => m.default);
            const addBalanceResult = await balanceManager.addBalance(
              session.user_id,
              0,
              parseFloat(income),
              'TON farming income'
            );

            if (addBalanceResult.success) {
              logger.info(`[FARMING_SCHEDULER] Successfully processed TON farming for user ${session.user_id}`, {
                userId: session.user_id,
                amount: income,
                currency: 'TON'
              });
            } else {
              logger.error(`[TON Farming] Error updating balance for user ${session.user_id}:`, addBalanceResult.error);
            }
          }
        } catch (error) {
          logger.error(`[TON Farming] Error processing session ${session.id}:`, error instanceof Error ? error.message : String(error));
        }
      }
    } catch (error) {
      logger.error('[TON Farming] Ошибка обработки автоматического начисления:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Рассчитывает доход от UNI фарминга
   */
  private async calculateUniFarmingIncome(farmer: any): Promise<string> {
    const now = new Date();
    const lastUpdate = farmer.uni_farming_last_update ? new Date(farmer.uni_farming_last_update) : new Date(farmer.uni_farming_start_timestamp);
    const hoursSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    
    // rate - это процент в день (например, 0.01 для 1% в день)
    const rate = parseFloat(farmer.uni_farming_rate || '0');
    const depositAmount = parseFloat(farmer.uni_deposit_amount || '0');
    
    // Рассчитываем доход: депозит * ставка * время_в_днях
    const daysElapsed = hoursSinceLastUpdate / 24;
    const income = depositAmount * rate * daysElapsed;
    
    logger.info(`[calculateUniFarmingIncome] Расчет дохода для пользователя ${farmer.id}:`, {
      depositAmount,
      rate,
      hoursSinceLastUpdate,
      daysElapsed,
      income,
      lastUpdate: lastUpdate.toISOString(),
      now: now.toISOString()
    });
    
    return income.toFixed(6);
  }

  /**
   * Рассчитывает доход от TON фарминга
   */
  private async calculateTonFarmingIncome(session: any): Promise<string> {
    const now = new Date();
    const lastClaim = session.last_claim ? new Date(session.last_claim) : new Date(session.started_at);
    const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
    
    const rate = parseFloat(session.rate || '0');
    const multiplier = parseFloat(session.boost_multiplier || '1');
    const income = rate * hoursSinceLastClaim * multiplier;
    
    return income.toFixed(6);
  }

  /**
   * Останавливает планировщик
   */
  stop(): void {
    if (this.isRunning) {
      this.isRunning = false;
      logger.info('🛑 Планировщик фарминг дохода остановлен');
    }
  }

  /**
   * Получает статус планировщика
   */
  getStatus(): { active: boolean; nextRun: Date | null } {
    if (!this.isRunning) {
      return { active: false, nextRun: null };
    }

    // Рассчитываем следующий запуск (каждые 5 минут)
    const nextRun = new Date();
    nextRun.setMinutes(Math.ceil(nextRun.getMinutes() / 5) * 5);
    nextRun.setSeconds(0);
    nextRun.setMilliseconds(0);

    return {
      active: this.isRunning,
      nextRun: nextRun
    };
  }
}

// Export singleton instance
export const farmingScheduler = new FarmingScheduler();