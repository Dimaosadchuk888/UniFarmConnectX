/**
 * Автоматический планировщик начисления фарминг дохода для Supabase API
 * Периодически обновляет баланс пользователей без ручного клейма
 */

import cron from 'node-cron';
import { supabase } from '../supabase';
import { logger } from '../logger';
import { BalanceNotificationService } from '../balanceNotificationService';
import { batchBalanceProcessor } from '../BatchBalanceProcessor';

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

      // Получаем активных UNI фармеров через репозиторий
      const UniFarmingRepository = await import('../../modules/farming/UniFarmingRepository').then(m => m.UniFarmingRepository);
      const uniFarmingRepo = new UniFarmingRepository();
      
      const activeFarmers = await uniFarmingRepo.getActiveFarmers();
      
      if (!activeFarmers) {
        logger.error('[UNI Farming] Ошибка получения активных фармеров');
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

      // Собираем все доходы для batch обработки
      const farmerIncomes: Array<{ userId: number; income: number; currency: 'UNI' }> = [];
      
      for (const farmer of activeFarmers || []) {
        try {
          const income = await this.calculateUniFarmingIncome(farmer);
          
          if (parseFloat(income) > 0) {
            farmerIncomes.push({
              userId: farmer.user_id,
              income: parseFloat(income),
              currency: 'UNI'
            });
          }
        } catch (error) {
          logger.error(`[UNI Farming] Ошибка расчета дохода для пользователя ${farmer.user_id}:`, error);
        }
      }
      
      // Выполняем batch обновление балансов
      if (farmerIncomes.length > 0) {
        logger.info(`[UNI Farming] Начинаем batch обновление для ${farmerIncomes.length} пользователей`);
        
        // TEMPORARY: Skip batch update to test transaction creation
        logger.info('[UNI Farming] TEMPORARY: Skipping batch update to test transaction creation');
        /*
        try {
          // Add timeout to batch processing
          const batchPromise = batchBalanceProcessor.processFarmingIncome(farmerIncomes);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Batch processing timeout')), 30000)
          );
          
          const batchResult = await Promise.race([batchPromise, timeoutPromise]) as any;
          
          logger.info('[UNI Farming] Batch обновление завершено', {
            processed: batchResult.processed,
            failed: batchResult.failed,
            duration: batchResult.duration
          });
        } catch (error) {
          logger.error('[UNI Farming] Ошибка batch обновления, продолжаем с созданием транзакций', {
            error: error instanceof Error ? error.message : String(error)
          });
          // Continue with transaction creation even if batch update fails
        }
        */
        
        // Update balances directly using BalanceManager for each farmer
        for (const income of farmerIncomes) {
          try {
            const { BalanceManager } = await import('../BalanceManager');
            const balanceManager = new BalanceManager();
            await balanceManager.addBalance(income.userId, income.income, income.currency);
            logger.info(`[UNI Farming] Updated balance for user ${income.userId}: +${income.income} ${income.currency}`);
          } catch (error) {
            logger.error(`[UNI Farming] Failed to update balance for user ${income.userId}:`, error);
          }
        }
        
      } else {
        logger.info('[UNI Farming] No farmers with income to process');
        return;
      }
      
      // Обрабатываем дополнительные операции для каждого фармера
      logger.info(`[UNI Farming] Starting transaction creation for ${activeFarmers?.length || 0} farmers`);
      
      for (const farmer of activeFarmers || []) {
        try {
          const incomeData = farmerIncomes.find(f => f.userId === farmer.user_id);
          if (!incomeData) {
            logger.info(`[UNI Farming] No income data for user ${farmer.user_id}, skipping`);
            continue;
          }
          
          const income = incomeData.income.toString();
          const updateError = null; // Batch обработка уже выполнена

            if (!updateError) {
              logger.info(`[UNI Farming] Creating FARMING_REWARD transaction for user ${farmer.user_id}, amount: ${income}`);
              
              // TODO: Исправить структуру farming_sessions для записи сессий
              // Временно отключено из-за несоответствия схемы БД
              /*
              await supabase
                .from('farming_sessions')
                .insert({
                  user_id: farmer.user_id,
                  session_type: 'UNI_FARMING',
                  amount_earned: parseFloat(income),
                  currency: 'UNI',
                  farming_rate: parseFloat(farmer.farming_rate || '0'),
                  session_start: farmer.farming_start || farmer.created_at,
                  session_end: new Date().toISOString(),
                  status: 'completed',
                  created_at: new Date().toISOString()
                });
              */

              // Создаем транзакцию FARMING_REWARD
              const { data: txData, error: txError } = await supabase
                .from('transactions')
                .insert({
                  user_id: farmer.user_id,
                  type: 'FARMING_REWARD',
                  amount: income, // Добавляем общее поле amount
                  amount_uni: income,
                  amount_ton: '0',
                  currency: 'UNI', // Добавляем валюту
                  status: 'completed',
                  description: `UNI farming income: ${parseFloat(income).toFixed(6)} UNI (rate: ${farmer.farming_rate})`,
                  source_user_id: farmer.user_id,
                  created_at: new Date().toISOString()
                })
                .select();
                
              if (txError) {
                logger.error(`[FARMING_SCHEDULER] Failed to create FARMING_REWARD transaction for user ${farmer.user_id}:`, {
                  error: txError.message,
                  code: txError.code,
                  details: txError.details
                });
                continue;
              }

              logger.info(`[FARMING_SCHEDULER] Successfully processed UNI farming for user ${farmer.user_id}`, {
                userId: farmer.user_id,
                amount: income,
                currency: 'UNI'
              });

              // Отправляем WebSocket уведомление через BalanceManager (уже происходит в addBalance)

              // Распределяем реферальные награды от UNI фарминга
              try {
                const { ReferralService } = await import('../../modules/referral/service');
                const referralService = new ReferralService();
                const referralResult = await referralService.distributeReferralRewards(
                  farmer.user_id.toString(),
                  income,
                  'UNI',
                  'farming'
                );

                if (referralResult.distributed > 0) {
                  logger.info(`[FARMING_SCHEDULER] Реферальные награды распределены для UNI фарминга`, {
                    farmerId: farmer.user_id,
                    income,
                    distributed: referralResult.distributed,
                    totalAmount: referralResult.totalAmount
                  });
                }
              } catch (referralError) {
                logger.error(`[FARMING_SCHEDULER] Ошибка распределения реферальных наград UNI`, {
                  farmerId: farmer.user_id,
                  income,
                  error: referralError instanceof Error ? referralError.message : String(referralError)
                });
              }
            }
        } catch (error) {
          logger.error(`[UNI Farming] Error processing farmer ${farmer.user_id}:`, error instanceof Error ? error.message : String(error));
        } finally {
          // Continue processing other farmers
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

      // Собираем все доходы для batch обработки
      const farmerIncomes: Array<{ userId: number; income: number; currency: 'TON' }> = [];
      
      for (const session of activeFarmers || []) {
        try {
          const income = await this.calculateTonFarmingIncome(session);
          
          if (parseFloat(income) > 0) {
            farmerIncomes.push({
              userId: session.user_id,
              income: parseFloat(income),
              currency: 'TON'
            });
          }
        } catch (error) {
          logger.error(`[TON Farming] Error processing session ${session.id}:`, error instanceof Error ? error.message : String(error));
        }
      }
      
      // Выполняем batch обновление балансов
      if (farmerIncomes.length > 0) {
        logger.info(`[TON Farming] Начинаем batch обновление для ${farmerIncomes.length} пользователей`);
        
        const batchResult = await batchBalanceProcessor.processFarmingIncome(farmerIncomes);
        
        logger.info('[TON Farming] Batch обновление завершено', {
          processed: batchResult.processed,
          failed: batchResult.failed,
          duration: batchResult.duration
        });
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
    const lastUpdate = farmer.farming_last_update ? new Date(farmer.farming_last_update) : new Date(farmer.farming_start || farmer.created_at);
    const hoursSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    
    // rate - это процент в день (например, 0.01 для 1% в день)
    const rate = parseFloat(farmer.farming_rate || '0');
    const depositAmount = parseFloat(farmer.deposit_amount || '0');
    
    // Рассчитываем доход: депозит * ставка * время_в_днях
    const daysElapsed = hoursSinceLastUpdate / 24;
    const income = depositAmount * rate * daysElapsed;
    
    logger.info(`[calculateUniFarmingIncome] Расчет дохода для пользователя ${farmer.user_id}:`, {
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