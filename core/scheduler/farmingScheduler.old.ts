/**
 * Автоматический планировщик начисления фарминг дохода
 * Периодически обновляет баланс пользователей без ручного клейма
 */

import cron from 'node-cron';
import { supabase } from '../supabaseClient';
import { WalletService } from '../../modules/wallet/service';
import { logger } from '../logger';

export class FarmingScheduler {
  private walletService: WalletService;
  private isRunning: boolean = false;

  constructor() {
    this.walletService = new WalletService();
  }

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

      logger.info(`[UNI Farming] Найдено ${activeFarmers.length} активных фармеров`);

      const processedCount = { success: 0, failed: 0, skipped: 0 };
      const timestamp = new Date().toISOString();

      for (const farmer of activeFarmers) {
        try {
          const income = await this.calculateUniFarmingIncome(farmer);
          
          if (parseFloat(income) > 0) {
            logger.debug(`[FARMING_SCHEDULER] Processing UNI income for user ${farmer.id}: ${income}`, {
              userId: farmer.id,
              calculatedIncome: income,
              currency: 'UNI',
              timestamp
            });
            
            const success = await this.walletService.addUniFarmIncome(
              farmer.id.toString(), 
              income
            );
            
            if (success) {
              // Обновляем время последнего начисления
              await db
                .update(users)
                .set({ uni_farming_last_update: new Date() })
                .where(eq(users.id, farmer.id));
              
              processedCount.success++;
              
              logger.info(`[FARMING_SCHEDULER] Successfully processed UNI farming for user ${farmer.id}`, {
                userId: farmer.id,
                amount: income,
                currency: 'UNI',
                operation: 'scheduled_farming_income',
                timestamp
              });
            } else {
              processedCount.failed++;
              logger.error(`[FARMING_SCHEDULER] Failed to process UNI income for user ${farmer.id}`, {
                userId: farmer.id,
                amount: income,
                currency: 'UNI',
                timestamp
              });
            }
          } else {
            processedCount.skipped++;
            logger.debug(`[FARMING_SCHEDULER] Skipped user ${farmer.id}: no UNI income to process`, {
              userId: farmer.id,
              calculatedIncome: income,
              currency: 'UNI',
              timestamp
            });
          }
        } catch (error) {
          processedCount.failed++;
          logger.error(`[FARMING_SCHEDULER] Critical error processing user ${farmer.id}`, {
            userId: farmer.id,
            currency: 'UNI',
            error: error instanceof Error ? error.message : String(error),
            timestamp
          });
        }
      }

      logger.info(`[FARMING_SCHEDULER] UNI farming cycle completed`, {
        processed: processedCount.success,
        failed: processedCount.failed,
        skipped: processedCount.skipped,
        total: activeFarmers.length,
        currency: 'UNI',
        timestamp
      });
    } catch (error) {
      logger.error('[UNI Farming] Критическая ошибка автоматического начисления:', error);
    }
  }

  /**
   * Обрабатывает автоматическое начисление TON фарминг дохода
   */
  private async processTonFarmingIncome(): Promise<void> {
    try {
      logger.info('[TON Farming] Начинаем обработку автоматического начисления дохода');

      // Находим всех активных TON фармеров через boost депозиты
      // Пока используем UNI поля как базу для TON фарминга
      const activeBoostUsers = await db
        .select()
        .from(users)
        .where(and(
          isNotNull(users.uni_farming_start_timestamp),
          isNotNull(users.uni_farming_rate)
        ));

      logger.info(`[TON Farming] Найдено ${activeBoostUsers.length} активных TON фармеров`);

      const processedCount = { success: 0, failed: 0, skipped: 0 };
      const timestamp = new Date().toISOString();

      for (const farmer of activeBoostUsers) {
        try {
          const income = await this.calculateTonFarmingIncome(farmer);
          
          if (parseFloat(income) > 0) {
            logger.debug(`[FARMING_SCHEDULER] Processing TON income for user ${farmer.id}: ${income}`, {
              userId: farmer.id,
              calculatedIncome: income,
              currency: 'TON',
              timestamp
            });
            
            const success = await this.walletService.addTonFarmIncome(
              farmer.id.toString(), 
              income
            );
            
            if (success) {
              // Обновляем время последнего начисления
              await db
                .update(users)
                .set({ uni_farming_last_update: new Date() })
                .where(eq(users.id, farmer.id));
              
              processedCount.success++;
              
              logger.info(`[FARMING_SCHEDULER] Successfully processed TON farming for user ${farmer.id}`, {
                userId: farmer.id,
                amount: income,
                currency: 'TON',
                operation: 'scheduled_farming_income',
                timestamp
              });
            } else {
              processedCount.failed++;
              logger.error(`[FARMING_SCHEDULER] Failed to process TON income for user ${farmer.id}`, {
                userId: farmer.id,
                amount: income,
                currency: 'TON',
                timestamp
              });
            }
          } else {
            processedCount.skipped++;
            logger.debug(`[FARMING_SCHEDULER] Skipped user ${farmer.id}: no TON income to process`, {
              userId: farmer.id,
              calculatedIncome: income,
              currency: 'TON',
              timestamp
            });
          }
        } catch (error) {
          processedCount.failed++;
          logger.error(`[FARMING_SCHEDULER] Critical error processing user ${farmer.id}`, {
            userId: farmer.id,
            currency: 'TON',
            error: error instanceof Error ? error.message : String(error),
            timestamp
          });
        }
      }

      logger.info(`[FARMING_SCHEDULER] TON farming cycle completed`, {
        processed: processedCount.success,
        failed: processedCount.failed,
        skipped: processedCount.skipped,
        total: activeBoostUsers.length,
        currency: 'TON',
        timestamp
      });
    } catch (error) {
      logger.error('[TON Farming] Критическая ошибка автоматического начисления:', error);
    }
  }

  /**
   * Рассчитывает доход UNI фарминга за период с последнего начисления
   */
  private async calculateUniFarmingIncome(farmer: any): Promise<string> {
    try {
      const now = new Date();
      const lastUpdate = farmer.uni_farming_last_update 
        ? new Date(farmer.uni_farming_last_update)
        : new Date(farmer.uni_farming_start_timestamp);
      
      const secondsElapsed = (now.getTime() - lastUpdate.getTime()) / 1000;
      
      // Базовая ставка 0.001 UNI в час = 0.000000277778 UNI в секунду
      const baseRatePerSecond = 0.001 / 3600;
      const ratePerSecond = parseFloat(farmer.uni_farming_rate || "0") || baseRatePerSecond;
      
      const income = secondsElapsed * ratePerSecond;
      
      return income.toFixed(8);
    } catch (error) {
      logger.error(`Ошибка расчета UNI дохода для пользователя ${farmer.id}:`, error);
      return "0";
    }
  }

  /**
   * Рассчитывает доход TON фарминга за период с последнего начисления
   */
  private async calculateTonFarmingIncome(farmer: any): Promise<string> {
    try {
      const now = new Date();
      const lastUpdate = farmer.uni_farming_last_update 
        ? new Date(farmer.uni_farming_last_update)
        : new Date(farmer.uni_farming_start_timestamp);
      
      const secondsElapsed = (now.getTime() - lastUpdate.getTime()) / 1000;
      // Используем базовую ставку TON = 0.0001 TON в час
      const tonRatePerSecond = 0.0001 / 3600;
      const ratePerSecond = tonRatePerSecond;
      
      if (ratePerSecond <= 0) {
        return "0";
      }
      
      const income = secondsElapsed * ratePerSecond;
      
      return income.toFixed(8);
    } catch (error) {
      logger.error(`Ошибка расчета TON дохода для пользователя ${farmer.id}:`, error);
      return "0";
    }
  }

  /**
   * Останавливает планировщик
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('FarmingScheduler уже остановлен');
      return;
    }

    // Gracefully stop cron jobs
    this.isRunning = false;
    logger.info('🔴 Планировщик фарминг дохода остановлен');
  }

  /**
   * Проверяет статус планировщика
   */
  getStatus(): { running: boolean; info: string } {
    return {
      running: this.isRunning,
      info: this.isRunning 
        ? 'Автоматическое начисление активно (каждые 5 минут)'
        : 'Автоматическое начисление неактивно'
    };
  }

  /**
   * Выполняет ручной запуск обработки (для тестирования)
   */
  async runManually(): Promise<void> {
    logger.info('🔧 Ручной запуск обработки фарминг дохода');
    await this.processUniFarmingIncome();
    await this.processTonFarmingIncome();
    logger.info('✅ Ручная обработка завершена');
  }
}

// Глобальный экземпляр планировщика
export const farmingScheduler = new FarmingScheduler();