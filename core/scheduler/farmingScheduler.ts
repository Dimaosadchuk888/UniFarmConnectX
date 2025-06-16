/**
 * Автоматический планировщик начисления фарминг дохода для Supabase API
 * Периодически обновляет баланс пользователей без ручного клейма
 */

import cron from 'node-cron';
import { supabase } from '../supabase';
import { logger } from '../logger';

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
      await this.processUniFarmingIncome();
      await this.processTonFarmingIncome();
    });

    this.isRunning = true;
    logger.info('✅ Планировщик фарминг дохода активен (каждые 5 минут)');
  }

  /**
   * Обрабатывает автоматическое начисление UNI фарминг дохода
   */
  private async processUniFarmingIncome(): Promise<void> {
    try {
      logger.info('[UNI Farming] Начинаем обработку автоматического начисления дохода');

      // Находим всех активных UNI фармеров
      const { data: activeFarmers, error } = await supabase
        .from('users')
        .select('*')
        .not('uni_farming_start_timestamp', 'is', null)
        .not('uni_farming_rate', 'is', null);

      if (error) {
        logger.error('[UNI Farming] Ошибка получения активных фармеров:', error.message);
        return;
      }

      logger.info(`[UNI Farming] Найдено ${activeFarmers?.length || 0} активных фармеров`);

      for (const farmer of activeFarmers || []) {
        try {
          const income = await this.calculateUniFarmingIncome(farmer);
          
          if (parseFloat(income) > 0) {
            // Обновляем баланс пользователя
            const { error: updateError } = await supabase
              .from('users')
              .update({
                balance_uni: parseFloat(farmer.balance_uni || '0') + parseFloat(income),
                uni_farming_last_update: new Date().toISOString()
              })
              .eq('id', farmer.id);

            if (!updateError) {
              logger.info(`[FARMING_SCHEDULER] Successfully processed UNI farming for user ${farmer.id}`, {
                userId: farmer.id,
                amount: income,
                currency: 'UNI'
              });

              // Распределяем реферальные награды от UNI фарминга
              try {
                const { ReferralService } = await import('../../modules/referral/service');
                const referralService = new ReferralService();
                const referralResult = await referralService.distributeReferralRewards(
                  farmer.id.toString(),
                  income,
                  'uni_farming',
                  'UNI'
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
            // Обновляем баланс пользователя
            const { error: updateError } = await supabase
              .from('users')
              .update({
                balance_ton: parseFloat(session.users?.balance_ton || '0') + parseFloat(income)
              })
              .eq('id', session.user_id);

            if (!updateError) {
              logger.info(`[FARMING_SCHEDULER] Successfully processed TON farming for user ${session.user_id}`, {
                userId: session.user_id,
                amount: income,
                currency: 'TON'
              });
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
    
    const rate = parseFloat(farmer.uni_farming_rate || '0');
    const income = rate * hoursSinceLastUpdate;
    
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
}

// Export singleton instance
export const farmingScheduler = new FarmingScheduler();