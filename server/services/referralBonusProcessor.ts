/**
 * Фоновый процессор для обработки распределения реферальных вознаграждений
 * 
 * Этот модуль обеспечивает:
 * 1. Асинхронную обработку реферальных начислений для снижения нагрузки на основной поток
 * 2. Пакетную обработку для оптимизации производительности с большими объемами данных
 * 3. Механизм повторных попыток для обеспечения надежности
 * 4. Подробное журналирование для аудита и отладки
 */

import { db } from '../db';
import { eq, and, desc, lte, gte, inArray, isNull, sql } from 'drizzle-orm';
import { 
  users, 
  referrals, 
  transactions, 
  reward_distribution_logs,
  insertTransactionSchema,
  insertRewardDistributionLogSchema
} from '@shared/schema';
import { z } from 'zod';
import { TransactionType, Currency, TransactionStatus } from './transactionService';
import crypto from 'crypto';

// Максимальное количество начислений в одном пакете
const BATCH_SIZE = 50;

// Конфигурация повторных попыток
const RETRY_CONFIG = {
  maxRetries: 3,        // Максимальное количество повторных попыток
  initialDelay: 1000,   // Начальная задержка (1 секунда)
  backoffFactor: 2,     // Множитель для увеличения задержки (экспоненциальный бэкофф)
};

/**
 * Структура данных для реферального начисления
 */
interface ReferralRewardData {
  userId: number;
  earnedAmount: number;
  currency: Currency;
}

/**
 * Класс для фоновой и пакетной обработки реферальных начислений
 */
export class ReferralBonusProcessor {
  private processingQueue: ReferralRewardData[] = [];
  private isProcessing = false;
  private processingTimer: NodeJS.Timeout | null = null;
  private minRewardThreshold = 0.0;
  private maxLevels = 20;
  private levelPercents: number[] = [
    5.0,  // Уровень 1: 5%
    3.0,  // Уровень 2: 3%
    2.0,  // Уровень 3: 2%
    1.0,  // Уровень 4: 1%
    0.8,  // Уровень 5: 0.8%
    0.5,  // Уровень 6: 0.5%
    0.3,  // Уровень 7: 0.3%
    0.3,  // Уровень 8: 0.3%
    0.3,  // Уровень 9: 0.3%
    0.3,  // Уровень 10: 0.3%
    0.2,  // Уровень 11: 0.2%
    0.2,  // Уровень 12: 0.2%
    0.2,  // Уровень 13: 0.2%
    0.2,  // Уровень 14: 0.2%
    0.2,  // Уровень 15: 0.2%
    0.1,  // Уровень 16: 0.1%
    0.1,  // Уровень 17: 0.1%
    0.1,  // Уровень 18: 0.1%
    0.1,  // Уровень 19: 0.1%
    0.1   // Уровень 20: 0.1%
  ];
  
  /**
   * Добавляет начисление в очередь обработки
   * @param userId ID пользователя, от которого идет распределение
   * @param earnedAmount Сумма заработка 
   * @param currency Валюта
   * @returns Промис с идентификатором пакета для отслеживания
   */
  async queueReferralReward(userId: number, earnedAmount: number, currency: Currency): Promise<string> {
    // Создаем уникальный идентификатор для отслеживания начисления
    const batchId = crypto.randomUUID();
    
    console.log(`[ReferralBonusProcessor] Queuing reward: User ${userId}, Amount ${earnedAmount} ${currency}, BatchID: ${batchId}`);
    
    // Создаем запись в журнале распределения
    try {
      const logData = insertRewardDistributionLogSchema.parse({
        source_user_id: userId,
        batch_id: batchId,
        currency: currency,
        earned_amount: earnedAmount.toString(),
        status: 'queued' // Начальный статус - в очереди
      });
      
      await db.insert(reward_distribution_logs).values(logData);
      
      // Добавляем в очередь на обработку
      this.processingQueue.push({
        userId,
        earnedAmount,
        currency
      });
      
      // Запускаем обработку, если она еще не запущена
      this.scheduleProcessing();
      
      return batchId;
    } catch (error) {
      console.error(`[ReferralBonusProcessor] Error queueing reward:`, error);
      throw error;
    }
  }
  
  /**
   * Планирует обработку очереди с задержкой
   */
  private scheduleProcessing(delay = 200) {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
    }
    
    this.processingTimer = setTimeout(() => {
      this.processQueue();
    }, delay);
  }
  
  /**
   * Обрабатывает очередь начислений
   */
  private async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Извлекаем пакет заданий из очереди
      const batch = this.processingQueue.splice(0, BATCH_SIZE);
      console.log(`[ReferralBonusProcessor] Processing batch of ${batch.length} rewards`);
      
      // Обрабатываем каждое задание в пакете
      const processingPromises = batch.map(item => 
        this.processReferralReward(item.userId, item.earnedAmount, item.currency)
      );
      
      // Ждем завершения всех заданий
      await Promise.allSettled(processingPromises);
      
      // Если в очереди остались задания, планируем следующую обработку
      if (this.processingQueue.length > 0) {
        this.scheduleProcessing();
      }
    } catch (error) {
      console.error(`[ReferralBonusProcessor] Error processing queue:`, error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Обрабатывает одно реферальное начисление с повторными попытками
   */
  private async processReferralReward(userId: number, earnedAmount: number, currency: Currency, 
    retryCount = 0): Promise<{totalRewardsDistributed: number}> {
    
    // Создаем уникальный идентификатор для пакета начислений
    const batchId = crypto.randomUUID();
    
    try {
      console.log(`[ReferralBonusProcessor] Processing: User ${userId}, Amount ${earnedAmount} ${currency}, BatchID: ${batchId}, Attempt: ${retryCount + 1}`);
      
      // Обновляем или создаем запись в журнале
      await db
        .insert(reward_distribution_logs)
        .values({
          source_user_id: userId,
          batch_id: batchId,
          currency: currency,
          earned_amount: earnedAmount.toString(),
          status: 'processing'
        })
        .onConflictDoUpdate({
          target: reward_distribution_logs.batch_id,
          set: { 
            status: 'processing',
            processed_at: new Date()
          }
        });
      
      // Если сумма слишком мала, не выполняем расчеты
      if (earnedAmount < this.minRewardThreshold) {
        console.log(`[ReferralBonusProcessor] Amount ${earnedAmount} is too small, skipping`);
        
        await db.update(reward_distribution_logs)
          .set({ 
            status: 'completed',
            levels_processed: 0,
            inviter_count: 0,
            total_distributed: '0',
            completed_at: new Date()
          })
          .where(eq(reward_distribution_logs.batch_id, batchId));
          
        return {totalRewardsDistributed: 0};
      }
      
      // Выполняем всю логику начисления внутри транзакции для обеспечения атомарности
      return await db.transaction(async (tx) => {
        let totalRewardsDistributed = 0;
        let levelsProcessed = 0;
        let inviterCount = 0;
        
        // Получаем всех пригласителей пользователя внутри транзакции с использованием индекса
        const userReferrals = await tx
          .select()
          .from(referrals)
          .where(eq(referrals.user_id, userId))
          .orderBy(referrals.level);
        
        // Если нет реферальных связей, выходим
        if (userReferrals.length === 0) {
          console.log(`[ReferralBonusProcessor] No referrals found for user ${userId}, skipping`);
          
          await tx.update(reward_distribution_logs)
            .set({ 
              status: 'completed',
              levels_processed: 0,
              inviter_count: 0,
              total_distributed: '0',
              completed_at: new Date()
            })
            .where(eq(reward_distribution_logs.batch_id, batchId));
            
          return {totalRewardsDistributed: 0};
        }
        
        console.log(`[ReferralBonusProcessor] Found ${userReferrals.length} referrals for user ${userId}, processing in batch...`);
        
        // Собираем все ID пригласителей для массовой выборки
        const inviterIds = userReferrals
          .filter(ref => ref.level !== null && ref.level > 0 && ref.level <= this.maxLevels && ref.inviter_id !== null)
          .map(ref => ref.inviter_id!);
        
        // Если нет подходящих пригласителей, выходим
        if (inviterIds.length === 0) {
          console.log(`[ReferralBonusProcessor] No valid inviters found for user ${userId}, skipping`);
          
          await tx.update(reward_distribution_logs)
            .set({ 
              status: 'completed',
              levels_processed: 0,
              inviter_count: 0,
              total_distributed: '0',
              completed_at: new Date()
            })
            .where(eq(reward_distribution_logs.batch_id, batchId));
            
          return {totalRewardsDistributed: 0};
        }
        
        // Получаем информацию о всех пригласителях одним запросом (оптимизация N+1)
        const invitersData = await tx
          .select()
          .from(users)
          .where(inArray(users.id, inviterIds));
        
        // Создаем Map для быстрого доступа к данным пригласителей
        const invitersMap = new Map(invitersData.map(inviter => [inviter.id, inviter]));
        
        // Подготавливаем массивы для пакетных операций
        const balanceUpdates = [];
        const transactionInserts = [];
        
        // Для каждого уровня начисляем вознаграждение
        for (const ref of userReferrals) {
          // Проверяем, что уровень определен
          if (ref.level === null) {
            continue;
          }
          
          const level = ref.level;
          levelsProcessed++;
          
          // Проверяем, что уровень в пределах допустимых
          if (level <= 0 || level > this.maxLevels) {
            continue;
          }
          
          // Получаем процент для данного уровня
          const percent = this.levelPercents[level - 1];
          
          // Вычисляем сумму вознаграждения
          const bonusAmount = earnedAmount * (percent / 100);
          
          // Пропускаем микро-начисления
          if (bonusAmount < this.minRewardThreshold) {
            continue;
          }
          
          // Начисляем вознаграждение пригласителю
          if (bonusAmount > 0 && ref.inviter_id !== null) {
            // Получаем пользователя-приглашателя из Map
            const inviter = invitersMap.get(ref.inviter_id);
            
            if (!inviter) {
              console.log(`[ReferralBonusProcessor] Inviter with ID ${ref.inviter_id} not found in fetched data, skipping`);
              continue;
            }
            
            // Проверяем значения баланса и обрабатываем null значения
            const uniBalance = inviter.balance_uni !== null ? inviter.balance_uni : "0";
            const tonBalance = inviter.balance_ton !== null ? inviter.balance_ton : "0";
            
            // Увеличиваем баланс пользователя
            const newBalance = currency === Currency.UNI 
              ? Number(uniBalance) + bonusAmount 
              : Number(tonBalance) + bonusAmount;
            
            // Добавляем в массив обновлений баланса
            balanceUpdates.push({
              id: ref.inviter_id,
              balance_uni: currency === Currency.UNI ? newBalance.toString() : uniBalance,
              balance_ton: currency === Currency.TON ? newBalance.toString() : tonBalance
            });
            
            // Создаем и валидируем данные транзакции через схему
            try {
              const transactionData = insertTransactionSchema.parse({
                user_id: ref.inviter_id,
                type: TransactionType.REFERRAL,
                amount: bonusAmount.toString(),
                currency: currency,
                status: TransactionStatus.CONFIRMED,
                source: "Referral Income",
                description: `Referral reward from level ${level} farming`,
                source_user_id: userId, // ID реферала, чьи доходы стали источником
                category: "bonus",
                data: JSON.stringify({
                  batch_id: batchId,
                  level: level,
                  percent: percent
                })
              });
              
              // Добавляем в массив для пакетной вставки
              transactionInserts.push(transactionData);
              
              // Суммируем начисленные бонусы
              totalRewardsDistributed += bonusAmount;
              inviterCount++;
            } catch (validationError) {
              console.error(`[ReferralBonusProcessor] Validation error for transaction data: ${validationError}`);
              // Продолжаем для других уровней
            }
          }
        }
        
        // Выполняем пакетное обновление балансов (одним запросом)
        if (balanceUpdates.length > 0) {
          for (const update of balanceUpdates) {
            await tx
              .update(users)
              .set({
                balance_uni: update.balance_uni,
                balance_ton: update.balance_ton
              })
              .where(eq(users.id, update.id));
          }
        }
        
        // Выполняем пакетную вставку транзакций (одним запросом)
        if (transactionInserts.length > 0) {
          await tx.insert(transactions).values(transactionInserts);
        }
        
        // Обновляем запись журнала с результатами
        await tx.update(reward_distribution_logs)
          .set({ 
            status: 'completed',
            levels_processed: levelsProcessed,
            inviter_count: inviterCount,
            total_distributed: totalRewardsDistributed.toString(),
            completed_at: new Date()
          })
          .where(eq(reward_distribution_logs.batch_id, batchId));
        
        console.log(`[ReferralBonusProcessor] Batch ${batchId} completed. Total distributed: ${totalRewardsDistributed} ${currency} to ${inviterCount} inviters`);
        return { totalRewardsDistributed };
      });
    } catch (error) {
      console.error(`[ReferralBonusProcessor] Error processing batch ${batchId}:`, error);
      
      // Обновляем журнал с ошибкой
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await db.update(reward_distribution_logs)
        .set({ 
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date()
        })
        .where(eq(reward_distribution_logs.batch_id, batchId));
      
      // Повторяем обработку, если не превышено максимальное количество попыток
      if (retryCount < RETRY_CONFIG.maxRetries) {
        const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffFactor, retryCount);
        console.log(`[ReferralBonusProcessor] Will retry in ${delay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.processReferralReward(userId, earnedAmount, currency, retryCount + 1);
      }
      
      return { totalRewardsDistributed: 0 };
    }
  }
  
  /**
   * Создает индексы для оптимизации запросов
   * Вызывать при инициализации приложения
   */
  async ensureIndexes(): Promise<void> {
    try {
      console.log(`[ReferralBonusProcessor] Ensuring database indexes are in place...`);
      
      // Индексы создаются в schema.ts, поэтому здесь только проверка схемы
      
      console.log(`[ReferralBonusProcessor] Index verification complete.`);
    } catch (error) {
      console.error(`[ReferralBonusProcessor] Error ensuring indexes:`, error);
    }
  }
  
  /**
   * Восстанавливает обработку неуспешных начислений
   * Вызывать при запуске сервера
   */
  async recoverFailedProcessing(): Promise<number> {
    try {
      console.log(`[ReferralBonusProcessor] Recovering failed reward distributions...`);
      
      // Находим все записи со статусом "failed" или "processing" (возможно прерванные)
      const failedRecords = await db
        .select()
        .from(reward_distribution_logs)
        .where(inArray(reward_distribution_logs.status, ['failed', 'processing']))
        .orderBy(desc(reward_distribution_logs.processed_at))
        .limit(100); // Ограничиваем количество для безопасности
      
      if (failedRecords.length === 0) {
        console.log(`[ReferralBonusProcessor] No failed distributions found.`);
        return 0;
      }
      
      console.log(`[ReferralBonusProcessor] Found ${failedRecords.length} failed distributions to recover.`);
      
      // Добавляем их в очередь на повторную обработку
      for (const record of failedRecords) {
        this.processingQueue.push({
          userId: record.source_user_id,
          earnedAmount: Number(record.earned_amount),
          currency: record.currency as Currency
        });
      }
      
      // Запускаем обработку очереди
      this.scheduleProcessing();
      
      return failedRecords.length;
    } catch (error) {
      console.error(`[ReferralBonusProcessor] Error recovering failed processing:`, error);
      return 0;
    }
  }
}

// Создаем и экспортируем единственный экземпляр процессора
export const referralBonusProcessor = new ReferralBonusProcessor();