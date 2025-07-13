/**
 * Batch процессор для массовых операций с балансами
 * Оптимизирует производительность при массовых начислениях
 */

import { supabase } from './supabase';
import { logger } from './logger';
import { balanceCache } from './BalanceCache';
import { BalanceNotificationService } from './balanceNotificationService';

interface BatchOperation {
  userId: number;
  amountUni?: number;
  amountTon?: number;
  operation: 'add' | 'subtract' | 'set';
  source?: string;
}

interface BatchResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ userId: number; error: string }>;
  duration: number;
}

export class BatchBalanceProcessor {
  private static instance: BatchBalanceProcessor;
  private readonly BATCH_SIZE = 100; // Обрабатываем по 100 записей за раз
  private readonly MAX_RETRIES = 3;

  public static getInstance(): BatchBalanceProcessor {
    if (!BatchBalanceProcessor.instance) {
      BatchBalanceProcessor.instance = new BatchBalanceProcessor();
    }
    return BatchBalanceProcessor.instance;
  }

  /**
   * Массовое обновление балансов
   */
  async processBatch(operations: BatchOperation[]): Promise<BatchResult> {
    const startTime = Date.now();
    let processed = 0;
    let failed = 0;
    const errors: Array<{ userId: number; error: string }> = [];

    logger.info('[BatchBalanceProcessor] Начало массовой обработки', {
      totalOperations: operations.length,
      batchSize: this.BATCH_SIZE
    });

    // Разбиваем на батчи
    const batches = this.chunkArray(operations, this.BATCH_SIZE);

    for (const [index, batch] of batches.entries()) {
      logger.info(`[BatchBalanceProcessor] Обработка батча ${index + 1}/${batches.length}`, {
        batchSize: batch.length
      });

      try {
        await this.processSingleBatch(batch);
        processed += batch.length;
        
        // Инвалидируем кеш для обработанных пользователей
        const userIds = batch.map(op => op.userId);
        balanceCache.invalidateBatch(userIds);
        
      } catch (error) {
        logger.error('[BatchBalanceProcessor] Ошибка обработки батча', {
          batchIndex: index,
          error: error instanceof Error ? error.message : String(error)
        });
        
        // Пытаемся обработать по одному при ошибке батча
        for (const operation of batch) {
          try {
            await this.processSingleOperation(operation);
            processed++;
          } catch (singleError) {
            failed++;
            errors.push({
              userId: operation.userId,
              error: singleError instanceof Error ? singleError.message : String(singleError)
            });
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    
    logger.info('[BatchBalanceProcessor] Массовая обработка завершена', {
      processed,
      failed,
      duration,
      totalErrors: errors.length
    });

    return {
      success: failed === 0,
      processed,
      failed,
      errors,
      duration
    };
  }

  /**
   * Массовое начисление доходов от фарминга
   */
  async processFarmingIncome(userIncomes: Array<{ userId: number; income: number; currency: 'UNI' | 'TON' }>): Promise<BatchResult> {
    const operations: BatchOperation[] = userIncomes.map(({ userId, income, currency }) => ({
      userId,
      amountUni: currency === 'UNI' ? income : 0,
      amountTon: currency === 'TON' ? income : 0,
      operation: 'add' as const,
      source: `${currency}_farming_income`
    }));

    return this.processBatch(operations);
  }

  /**
   * Массовое начисление реферальных наград
   */
  async processReferralRewards(rewards: Array<{ userId: number; amountUni: number; amountTon: number }>): Promise<BatchResult> {
    const operations: BatchOperation[] = rewards.map(({ userId, amountUni, amountTon }) => ({
      userId,
      amountUni,
      amountTon,
      operation: 'add' as const,
      source: 'referral_reward'
    }));

    return this.processBatch(operations);
  }

  /**
   * Обработка одного батча через bulk update
   */
  private async processSingleBatch(batch: BatchOperation[]): Promise<void> {
    // Группируем операции по типу для оптимизации
    const addOperations = batch.filter(op => op.operation === 'add');
    const subtractOperations = batch.filter(op => op.operation === 'subtract');
    const setOperations = batch.filter(op => op.operation === 'set');

    // Обрабатываем операции сложения
    if (addOperations.length > 0) {
      await this.processBulkAdd(addOperations);
    }

    // Обрабатываем операции вычитания
    if (subtractOperations.length > 0) {
      await this.processBulkSubtract(subtractOperations);
    }

    // Операции установки обрабатываем по одной
    for (const operation of setOperations) {
      await this.processSingleOperation(operation);
    }
  }

  /**
   * Массовое добавление к балансам через SQL
   */
  private async processBulkAdd(operations: BatchOperation[]): Promise<void> {
    // Создаем SQL запрос для массового обновления
    const updates = operations.map(op => ({
      user_id: op.userId,
      uni_increment: op.amountUni || 0,
      ton_increment: op.amountTon || 0
    }));

    // Обрабатываем каждое обновление
    for (const update of updates) {
      try {
        // Сначала пробуем RPC функцию для атомарного обновления
        const { data, error } = await supabase
          .rpc('increment_user_balance', {
            p_user_id: update.user_id,
            p_uni_amount: update.uni_increment,
            p_ton_amount: update.ton_increment
          });

        if (error) {
          // Fallback: получаем текущий баланс и обновляем
          const { data: currentUser, error: fetchError } = await supabase
            .from('users')
            .select('balance_uni, balance_ton')
            .eq('id', update.user_id)
            .single();

          if (fetchError) {
            throw new Error(`Failed to fetch user ${update.user_id}: ${fetchError.message}`);
          }

          const newUniBalance = parseFloat(currentUser.balance_uni || '0') + update.uni_increment;
          const newTonBalance = parseFloat(currentUser.balance_ton || '0') + update.ton_increment;

          const { error: updateError } = await supabase
            .from('users')
            .update({
              balance_uni: newUniBalance,
              balance_ton: newTonBalance
            })
            .eq('id', update.user_id);

          if (updateError) {
            throw new Error(`Failed to update user ${update.user_id}: ${updateError.message}`);
          }

          // Инвалидируем кеш для пользователя
          balanceCache.invalidate(update.user_id);
        }
      } catch (error) {
        logger.error('[BatchBalanceProcessor] Ошибка при обновлении баланса', {
          userId: update.user_id,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }

    // Отправляем массовые уведомления
    const notificationService = BalanceNotificationService.getInstance();
    for (const op of operations) {
      // Получаем актуальные балансы после обновления
      const { data: userData, error } = await supabase
        .from('users')
        .select('balance_uni, balance_ton')
        .eq('id', op.userId)
        .single();
        
      if (userData) {
        notificationService.notifyBalanceUpdate({
          userId: op.userId,
          balanceUni: parseFloat(userData.balance_uni),
          balanceTon: parseFloat(userData.balance_ton),
          changeAmount: op.amountUni || op.amountTon || 0,
          currency: op.amountUni ? 'UNI' : 'TON',
          source: op.source || 'batch_update',
          timestamp: new Date().toISOString()
        });
      } else {
        logger.error('[BatchBalanceProcessor] Не удалось получить балансы для уведомления', {
          userId: op.userId,
          error: error?.message
        });
      }
    }
  }

  /**
   * Массовое вычитание из балансов
   */
  private async processBulkSubtract(operations: BatchOperation[]): Promise<void> {
    // Обрабатываем каждую операцию вычитания
    for (const op of operations) {
      try {
        // Получаем текущий баланс пользователя
        const { data: currentUser, error: fetchError } = await supabase
          .from('users')
          .select('balance_uni, balance_ton')
          .eq('id', op.userId)
          .single();

        if (fetchError) {
          throw new Error(`Failed to fetch user ${op.userId}: ${fetchError.message}`);
        }

        // Вычисляем новые балансы с защитой от отрицательных значений
        const currentUni = parseFloat(currentUser.balance_uni || '0');
        const currentTon = parseFloat(currentUser.balance_ton || '0');
        const newUniBalance = Math.max(0, currentUni - (op.amountUni || 0));
        const newTonBalance = Math.max(0, currentTon - (op.amountTon || 0));

        // Обновляем балансы
        const { error: updateError } = await supabase
          .from('users')
          .update({
            balance_uni: newUniBalance,
            balance_ton: newTonBalance
          })
          .eq('id', op.userId);

        if (updateError) {
          throw new Error(`Failed to subtract from user ${op.userId}: ${updateError.message}`);
        }

        // Инвалидируем кеш
        balanceCache.invalidate(op.userId);
        
        // Отправляем уведомление о изменении баланса
        const notificationService = BalanceNotificationService.getInstance();
        notificationService.notifyBalanceUpdate({
          userId: op.userId,
          balanceUni: newUniBalance,
          balanceTon: newTonBalance,
          changeAmount: -(op.amountUni || op.amountTon || 0),
          currency: op.amountUni ? 'UNI' : 'TON',
          source: op.source || 'batch_subtract',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('[BatchBalanceProcessor] Ошибка при вычитании из баланса', {
          userId: op.userId,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }
  }

  /**
   * Обработка одной операции
   */
  private async processSingleOperation(operation: BatchOperation): Promise<void> {
    const { userId, amountUni = 0, amountTon = 0, operation: op, source } = operation;

    // Получаем текущий баланс
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('balance_uni, balance_ton')
      .eq('id', userId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch user ${userId}: ${fetchError.message}`);
    }

    let newUniBalance = parseFloat(user.balance_uni || '0');
    let newTonBalance = parseFloat(user.balance_ton || '0');

    switch (op) {
      case 'add':
        newUniBalance += amountUni;
        newTonBalance += amountTon;
        break;
      case 'subtract':
        newUniBalance = Math.max(0, newUniBalance - amountUni);
        newTonBalance = Math.max(0, newTonBalance - amountTon);
        break;
      case 'set':
        newUniBalance = amountUni;
        newTonBalance = amountTon;
        break;
    }

    // Обновляем баланс
    const { error: updateError } = await supabase
      .from('users')
      .update({
        balance_uni: newUniBalance,
        balance_ton: newTonBalance
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update user ${userId}: ${updateError.message}`);
    }

    // Инвалидируем кеш
    balanceCache.invalidate(userId);
  }

  /**
   * Разбивка массива на чанки
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Экспортируем синглтон
export const batchBalanceProcessor = BatchBalanceProcessor.getInstance();