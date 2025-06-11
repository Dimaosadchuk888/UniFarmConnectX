/**
 * Автоматический планировщик начисления фарминг дохода
 * Периодически обновляет баланс пользователей без ручного клейма
 */

import cron from 'node-cron';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
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
      const activeFarmers = await db
        .select()
        .from(users)
        .where(and(
          isNotNull(users.uni_farming_start_timestamp),
          isNotNull(users.uni_farming_rate)
        ));

      logger.info(`[UNI Farming] Найдено ${activeFarmers.length} активных фармеров`);

      const processedCount = { success: 0, failed: 0 };

      for (const farmer of activeFarmers) {
        try {
          const income = await this.calculateUniFarmingIncome(farmer);
          
          if (parseFloat(income) > 0) {
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
              logger.debug(`[UNI Farming] ✅ Пользователь ${farmer.id}: начислено ${income} UNI`);
            } else {
              processedCount.failed++;
              logger.warn(`[UNI Farming] ❌ Ошибка начисления для пользователя ${farmer.id}`);
            }
          }
        } catch (error) {
          processedCount.failed++;
          logger.error(`[UNI Farming] Ошибка обработки пользователя ${farmer.id}:`, error);
        }
      }

      logger.info(`[UNI Farming] Завершено: ${processedCount.success} успешно, ${processedCount.failed} ошибок`);
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

      const processedCount = { success: 0, failed: 0 };

      for (const farmer of activeBoostUsers) {
        try {
          const income = await this.calculateTonFarmingIncome(farmer);
          
          if (parseFloat(income) > 0) {
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
              logger.debug(`[TON Farming] ✅ Пользователь ${farmer.id}: начислено ${income} TON`);
            } else {
              processedCount.failed++;
              logger.warn(`[TON Farming] ❌ Ошибка начисления для пользователя ${farmer.id}`);
            }
          }
        } catch (error) {
          processedCount.failed++;
          logger.error(`[TON Farming] Ошибка обработки пользователя ${farmer.id}:`, error);
        }
      }

      logger.info(`[TON Farming] Завершено: ${processedCount.success} успешно, ${processedCount.failed} ошибок`);
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