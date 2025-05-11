/**
 * Оптимизированный процессор для обработки распределения реферальных вознаграждений
 * 
 * Улучшения в этой версии:
 * 1. Использование рекурсивных CTE для эффективной работы с глубокими цепочками
 * 2. Улучшенные атомарные транзакции с надежной обработкой ошибок
 * 3. Оптимизация пакетной обработки для больших объемов данных
 * 4. Детальный мониторинг производительности
 */

import { db } from '../db';
import { eq, and, desc, lte, gte, inArray, isNull, sql } from 'drizzle-orm';
import { 
  users, 
  referrals, 
  transactions, 
  reward_distribution_logs,
  performance_metrics,
  insertTransactionSchema,
  insertRewardDistributionLogSchema
} from '@shared/schema';
import { optimizedReferralTreeService } from './optimizedReferralTreeService';
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
 * Интерфейс для обновления баланса
 */
interface BalanceUpdate {
  id: number;
  amount: number;
}

/**
 * Тип для массива пользовательских ID
 */
type UserIdArray = number[];

/**
 * Класс для фоновой и пакетной обработки реферальных начислений
 * Улучшенная версия с использованием рекурсивных CTE и оптимизированных транзакций
 */
export class OptimizedReferralBonusProcessor {
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
   * Инициализация процессора
   * Создает необходимые индексы и восстанавливает неуспешные начисления
   */
  async initialize(): Promise<void> {
    try {
      console.log('[OptimizedReferralBonusProcessor] Initializing...');
      
      // Создаем индексы для оптимизации запросов
      await this.ensureIndexes();
      
      // Восстанавливаем неуспешные начисления
      const recoveredCount = await this.recoverFailedProcessing();
      console.log(`[OptimizedReferralBonusProcessor] Recovered ${recoveredCount} failed distributions`);
      
      console.log('[OptimizedReferralBonusProcessor] Initialization complete');
    } catch (error) {
      console.error('[OptimizedReferralBonusProcessor] Initialization error:', error);
    }
  }
  
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
    const startTime = performance.now();
    
    console.log(`[OptimizedReferralBonusProcessor] Queuing reward: User ${userId}, Amount ${earnedAmount} ${currency}, BatchID: ${batchId}`);
    
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
      
      // Регистрируем метрику времени выполнения
      const duration = performance.now() - startTime;
      await this.logPerformanceMetric('queue_referral_reward', batchId, duration);
      
      // Запускаем обработку, если она еще не запущена
      this.scheduleProcessing();
      
      return batchId;
    } catch (error) {
      console.error(`[OptimizedReferralBonusProcessor] Error queueing reward:`, error);
      
      // Регистрируем ошибку
      const duration = performance.now() - startTime;
      await this.logPerformanceMetric('queue_referral_reward_error', batchId, duration, `${error}`);
      
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
    const startTime = performance.now();
    const batchId = crypto.randomUUID();
    
    try {
      // Извлекаем пакет заданий из очереди
      const batch = this.processingQueue.splice(0, BATCH_SIZE);
      console.log(`[OptimizedReferralBonusProcessor] Processing batch of ${batch.length} rewards, BatchID: ${batchId}`);
      
      // Обрабатываем каждое задание в пакете
      const processingPromises = batch.map(item => 
        this.processReferralReward(item.userId, item.earnedAmount, item.currency)
      );
      
      // Ждем завершения всех заданий
      const results = await Promise.allSettled(processingPromises);
      
      // Анализируем результаты
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`[OptimizedReferralBonusProcessor] Batch ${batchId} processed: ${succeeded} succeeded, ${failed} failed`);
      
      // Регистрируем метрику производительности
      const duration = performance.now() - startTime;
      await this.logPerformanceMetric('process_batch', batchId, duration, 
        JSON.stringify({ batch_size: batch.length, succeeded, failed }));
      
      // Если в очереди остались задания, планируем следующую обработку
      if (this.processingQueue.length > 0) {
        this.scheduleProcessing();
      }
    } catch (error) {
      console.error(`[OptimizedReferralBonusProcessor] Error processing queue:`, error);
      
      // Регистрируем ошибку
      const duration = performance.now() - startTime;
      await this.logPerformanceMetric('process_batch_error', batchId, duration, `${error}`);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Обрабатывает одно реферальное начисление с использованием рекурсивных CTE
   * и надежных атомарных транзакций
   */
  private async processReferralReward(userId: number, earnedAmount: number, currency: Currency, 
    retryCount = 0): Promise<{totalRewardsDistributed: number}> {
    
    // Создаем уникальный идентификатор для пакета начислений
    const batchId = crypto.randomUUID();
    const startTime = performance.now();
    
    try {
      console.log(`[OptimizedReferralBonusProcessor] Processing: User ${userId}, Amount ${earnedAmount} ${currency}, BatchID: ${batchId}, Attempt: ${retryCount + 1}`);
      
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
        console.log(`[OptimizedReferralBonusProcessor] Amount ${earnedAmount} is too small, skipping`);
        
        await db.update(reward_distribution_logs)
          .set({ 
            status: 'completed',
            levels_processed: 0,
            inviter_count: 0,
            total_distributed: '0',
            completed_at: new Date()
          })
          .where(eq(reward_distribution_logs.batch_id, batchId));
          
        // Записываем метрику производительности
        const duration = performance.now() - startTime;
        await this.logPerformanceMetric('skip_small_amount', batchId, duration);
        
        return {totalRewardsDistributed: 0};
      }
      
      // Выполняем всю логику начисления внутри транзакции для обеспечения атомарности
      return await db.transaction(async (tx) => {
        // Начинаем отсчет времени для SQL-запросов
        const sqlStartTime = performance.now();
        
        // Получаем пригласителей пользователя с использованием оптимизированного рекурсивного запроса
        const inviters = await optimizedReferralTreeService.getUserInviters(userId, this.maxLevels);
        
        const sqlDuration = performance.now() - sqlStartTime;
        console.log(`[OptimizedReferralBonusProcessor] Got ${inviters.length} inviters in ${sqlDuration.toFixed(2)}ms`);
        
        // Если нет пригласителей, выходим
        if (inviters.length === 0) {
          console.log(`[OptimizedReferralBonusProcessor] No inviters found for user ${userId}, skipping`);
          
          await tx.update(reward_distribution_logs)
            .set({ 
              status: 'completed',
              levels_processed: 0,
              inviter_count: 0,
              total_distributed: '0',
              completed_at: new Date()
            })
            .where(eq(reward_distribution_logs.batch_id, batchId));
            
          // Записываем метрику производительности
          const duration = performance.now() - startTime;
          await this.logPerformanceMetric('no_inviters', batchId, duration);
          
          return {totalRewardsDistributed: 0};
        }
        
        // Получаем ID всех пригласителей для массовой выборки
        const inviterIds = inviters.map(inviter => inviter.id);
        
        // Получаем данные всех пригласителей одним запросом
        const invitersData = await tx
          .select()
          .from(users)
          .where(inArray(users.id, inviterIds));
        
        // Создаем Map для быстрого доступа к данным пригласителей
        const invitersMap = new Map(invitersData.map(inviter => [inviter.id, inviter]));
        
        // Подготавливаем массивы для пакетных операций
        const balanceUpdates: BalanceUpdate[] = [];
        const transactionInserts: any[] = [];
        
        // Общие счетчики
        let totalRewardsDistributed = 0;
        let inviterCount = 0;
        
        // Предварительная групповая обработка - вычисляем награды для всех уровней сразу
        const bonusCalcs = inviters
          .filter(inviter => 
            inviter.level > 0 && 
            inviter.level <= this.maxLevels
          )
          .map(inviter => {
            const level = inviter.level;
            const percent = this.levelPercents[level - 1];
            const bonusAmount = earnedAmount * (percent / 100);
            
            return {
              level,
              inviter_id: inviter.id,
              percent,
              bonusAmount,
              valid: bonusAmount >= this.minRewardThreshold
            };
          })
          .filter(calc => calc.valid);
          
        console.log(`[OptimizedReferralBonusProcessor] Calculated rewards for ${bonusCalcs.length} valid inviters out of ${inviters.length} total`);
        
        // Группируем бонусы по получателям для случаев, когда пользователь может получить 
        // вознаграждения с нескольких уровней (например, при цикличных структурах)
        const bonusesByInviter: Record<number, any[]> = {};
        
        // Группируем бонусы по ID пригласителя
        for (const calc of bonusCalcs) {
          const key = calc.inviter_id;
          if (!bonusesByInviter[key]) {
            bonusesByInviter[key] = [];
          }
          bonusesByInviter[key].push(calc);
        }
        
        // Обрабатываем каждого уникального пригласителя один раз
        for (const inviterId of Object.keys(bonusesByInviter)) {
          const numericInviterId = parseInt(inviterId);
          const bonuses = bonusesByInviter[numericInviterId];
          // Получаем пользователя-приглашателя из Map
          const inviter = invitersMap.get(numericInviterId);
          
          if (!inviter) {
            console.log(`[OptimizedReferralBonusProcessor] Inviter with ID ${inviterId} not found in fetched data, skipping`);
            continue;
          }
          
          // Обработка всех бонусов для одного пригласителя
          let totalInviterBonus = 0;
          const inviterTransactions = [];
          
          for (const bonus of bonuses) {
            // Накапливаем общую сумму бонусов для этого пригласителя
            totalInviterBonus += bonus.bonusAmount;
            
            // Создаем транзакцию для каждого отдельного бонуса
            try {
              const transactionData = insertTransactionSchema.parse({
                user_id: Number(inviterId),
                type: TransactionType.REFERRAL,
                amount: bonus.bonusAmount.toString(),
                currency: currency,
                status: TransactionStatus.CONFIRMED,
                source: "Referral Income",
                description: `Referral reward from level ${bonus.level} farming (optimized)`,
                source_user_id: userId,
                category: "bonus",
                data: JSON.stringify({
                  batch_id: batchId,
                  level: bonus.level,
                  percent: bonus.percent
                })
              });
              
              // Добавляем в массив транзакций для этого пользователя
              inviterTransactions.push(transactionData);
              
              // Подсчитываем общее количество бонусных начислений
              inviterCount++;
            } catch (validationError) {
              console.error(`[OptimizedReferralBonusProcessor] Validation error for transaction data: ${validationError}`);
              // Продолжаем для других бонусов
            }
          }
          
          // Добавляем все транзакции для пользователя в общий массив
          transactionInserts.push(...inviterTransactions);
          
          // Вычисляем новый баланс (один раз для всех бонусов пользователя)
          if (totalInviterBonus > 0) {
            // Проверяем значения баланса и обрабатываем null значения
            const uniBalance = inviter.balance_uni !== null ? inviter.balance_uni : "0";
            const tonBalance = inviter.balance_ton !== null ? inviter.balance_ton : "0";
            
            // Добавляем в массив обновлений баланса (один раз для каждого пользователя)
            balanceUpdates.push({
              id: Number(inviterId),
              amount: totalInviterBonus
            });
            
            // Суммируем все начисленные бонусы для общей статистики
            totalRewardsDistributed += totalInviterBonus;
          }
        }
        
        // Теперь выполняем пакетное обновление балансов с помощью VALUES и CASE
        if (balanceUpdates.length > 0) {
          console.log(`[OptimizedReferralBonusProcessor] Performing batch balance update for ${balanceUpdates.length} users`);
          
          // Сортируем обновления для консистентности
          balanceUpdates.sort((a, b) => Number(a.id) - Number(b.id));
          
          // Строим массив ID пользователей для обновления
          const updateUserIds: UserIdArray = balanceUpdates.map(update => Number(update.id));
          
          // Строим сложное выражение CASE для массового обновления
          const caseExpressions = balanceUpdates.map(update => {
            // Для каждого ID пользователя определяем, сколько добавить к его балансу
            const fieldName = currency === Currency.UNI ? 'balance_uni' : 'balance_ton';
            return sql`WHEN ${update.id} THEN ${fieldName}::numeric + ${update.amount}`;
          });
          
          // Выполняем единое массовое обновление для всех пользователей
          await tx
            .update(users)
            .set({
              [currency === Currency.UNI ? 'balance_uni' : 'balance_ton']: 
                sql`CASE id ${sql.join(caseExpressions, ' ')} ELSE ${currency === Currency.UNI ? 'balance_uni' : 'balance_ton'} END`
            })
            .where(inArray(users.id, updateUserIds));
        }
        
        // Выполняем пакетную вставку всех транзакций (одним запросом)
        if (transactionInserts.length > 0) {
          console.log(`[OptimizedReferralBonusProcessor] Inserting ${transactionInserts.length} transactions in batch`);
          await tx.insert(transactions).values(transactionInserts);
        }
        
        // Обновляем запись журнала с результатами
        await tx.update(reward_distribution_logs)
          .set({ 
            status: 'completed',
            levels_processed: inviters.length,
            inviter_count: inviterCount,
            total_distributed: totalRewardsDistributed.toString(),
            completed_at: new Date()
          })
          .where(eq(reward_distribution_logs.batch_id, batchId));
        
        // Записываем метрику производительности
        const duration = performance.now() - startTime;
        await this.logPerformanceMetric('process_success', batchId, duration, 
          JSON.stringify({
            inviters_count: inviters.length,
            rewards_count: inviterCount,
            total_amount: totalRewardsDistributed
          }));
        
        console.log(`[OptimizedReferralBonusProcessor] Batch ${batchId} completed. Total distributed: ${totalRewardsDistributed} ${currency} to ${inviterCount} inviters in ${duration.toFixed(2)}ms`);
        return { totalRewardsDistributed };
      });
    } catch (error) {
      console.error(`[OptimizedReferralBonusProcessor] Error processing batch ${batchId}:`, error);
      
      // Обновляем журнал с ошибкой
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await db.update(reward_distribution_logs)
        .set({ 
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date()
        })
        .where(eq(reward_distribution_logs.batch_id, batchId));
      
      // Записываем метрику ошибки
      const duration = performance.now() - startTime;
      await this.logPerformanceMetric('process_error', batchId, duration, errorMessage);
      
      // Повторяем обработку, если не превышено максимальное количество попыток
      if (retryCount < RETRY_CONFIG.maxRetries) {
        const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffFactor, retryCount);
        console.log(`[OptimizedReferralBonusProcessor] Will retry in ${delay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`);
        
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
      console.log(`[OptimizedReferralBonusProcessor] Ensuring database indexes are in place...`);
      
      // Создаем индексы для ref_code и parent_ref_code
      await optimizedReferralTreeService.createOptimalIndexes();
      
      // Создаем таблицу для метрик производительности, если еще не создана
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS performance_metrics (
          id SERIAL PRIMARY KEY,
          operation TEXT NOT NULL,
          batch_id TEXT,
          duration_ms NUMERIC(12, 2) NOT NULL,
          timestamp TIMESTAMP DEFAULT NOW(),
          details TEXT
        )
      `);
      
      // Создаем индекс для быстрого поиска метрик по операции
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation 
        ON performance_metrics (operation)
      `);
      
      // Создаем индекс для reward_distribution_logs по source_user_id
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_reward_distribution_logs_source_user_id 
        ON reward_distribution_logs (source_user_id)
      `);
      
      // Создаем индекс для транзакций по source_user_id
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_transactions_source_user_id 
        ON transactions (source_user_id)
      `);
      
      console.log(`[OptimizedReferralBonusProcessor] Database indexes created successfully`);
    } catch (error) {
      console.error(`[OptimizedReferralBonusProcessor] Error ensuring indexes:`, error);
    }
  }
  
  /**
   * Записывает метрику производительности в базу данных
   */
  private async logPerformanceMetric(operation: string, batchId: string, durationMs: number, details: string = ''): Promise<void> {
    try {
      await db.insert(performance_metrics).values({
        operation,
        batch_id: batchId,
        duration_ms: durationMs.toFixed(2),
        details
      });
    } catch (error) {
      console.error(`[OptimizedReferralBonusProcessor] Error logging performance metric:`, error);
    }
  }
  
  /**
   * Восстанавливает обработку неуспешных начислений
   * Вызывать при запуске сервера
   */
  async recoverFailedProcessing(): Promise<number> {
    try {
      console.log(`[OptimizedReferralBonusProcessor] Recovering failed reward distributions...`);
      
      // Находим все записи со статусом "failed" или "processing" (возможно прерванные)
      const failedRecords = await db
        .select()
        .from(reward_distribution_logs)
        .where(inArray(reward_distribution_logs.status, ['failed', 'processing']))
        .orderBy(desc(reward_distribution_logs.processed_at))
        .limit(100); // Ограничиваем количество для безопасности
      
      if (failedRecords.length === 0) {
        console.log(`[OptimizedReferralBonusProcessor] No failed distributions found.`);
        return 0;
      }
      
      console.log(`[OptimizedReferralBonusProcessor] Found ${failedRecords.length} failed distributions to recover.`);
      
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
      console.error(`[OptimizedReferralBonusProcessor] Error recovering failed processing:`, error);
      return 0;
    }
  }
  
  /**
   * Анализирует производительность и возвращает статистику
   */
  async getPerformanceStats(): Promise<any> {
    try {
      // Получаем агрегированные метрики по операциям
      const operationStats = await db.execute(sql`
        SELECT 
          operation, 
          COUNT(*) as count, 
          AVG(duration_ms) as avg_duration, 
          MIN(duration_ms) as min_duration, 
          MAX(duration_ms) as max_duration,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration
        FROM 
          performance_metrics
        GROUP BY 
          operation
        ORDER BY 
          avg_duration DESC
      `);
      
      // Получаем статистику по количеству обработанных пользователей
      const userStats = await db.execute(sql`
        SELECT 
          AVG(inviter_count) as avg_inviters,
          MAX(inviter_count) as max_inviters,
          SUM(inviter_count) as total_inviters,
          COUNT(*) as total_batches
        FROM 
          reward_distribution_logs
        WHERE 
          status = 'completed'
      `);
      
      return {
        operations: operationStats.rows,
        users: userStats.rows[0]
      };
    } catch (error) {
      console.error(`[OptimizedReferralBonusProcessor] Error getting performance stats:`, error);
      return { error: 'Failed to get performance statistics' };
    }
  }
}

// Создаем и экспортируем единственный экземпляр оптимизированного процессора
export const optimizedReferralBonusProcessor = new OptimizedReferralBonusProcessor();