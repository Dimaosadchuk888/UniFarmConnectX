/**
 * 🛡️ БЕЗОПАСНЫЙ HELPER ДЛЯ ПРЕДОТВРАЩЕНИЯ ДУБЛИКАТОВ В ПРОДАКШЕНЕ
 * Может быть импортирован в любое место без изменения архитектуры
 */

import { supabase } from './core/supabase';
import { logger } from './core/logger';

export class DeduplicationHelper {
  
  /**
   * Проверяет существование недавней транзакции
   * БЕЗОПАСНО: только читает из БД, ничего не изменяет
   */
  static async checkRecentTransaction(
    userId: number,
    transactionType: string,
    amount: string | number,
    currency: string,
    timeWindowMinutes: number = 10
  ): Promise<{ exists: boolean; existingTransaction?: any }> {
    try {
      const timeWindowAgo = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();
      
      const { data: existing, error } = await supabase
        .from('transactions')
        .select('id, created_at, description, amount')
        .eq('user_id', userId)
        .eq('type', transactionType)
        .eq('amount', amount.toString())
        .eq('currency', currency)
        .gte('created_at', timeWindowAgo)
        .limit(1);

      if (error) {
        logger.error('[DeduplicationHelper] Ошибка проверки дубликатов:', error);
        return { exists: false }; // В случае ошибки разрешаем операцию
      }

      if (existing && existing.length > 0) {
        logger.warn('[DeduplicationHelper] 🛡️ Найден дублирующий транзакция:', {
          userId,
          transactionType,
          amount,
          currency,
          existingId: existing[0].id,
          existingTime: existing[0].created_at,
          timeWindowMinutes
        });
        
        return { 
          exists: true, 
          existingTransaction: existing[0] 
        };
      }

      return { exists: false };
      
    } catch (error) {
      logger.error('[DeduplicationHelper] Exception при проверке дубликатов:', error);
      return { exists: false }; // В случае исключения разрешаем операцию
    }
  }

  /**
   * Проверяет конкретно DAILY_BONUS дубликаты
   * БЕЗОПАСНО: специализированная проверка для TON Boost бонусов
   */
  static async checkDailyBonusDuplicate(
    userId: number, 
    bonusAmount: number,
    packageName: string
  ): Promise<{ isDuplicate: boolean; message?: string }> {
    try {
      const result = await this.checkRecentTransaction(
        userId,
        'DAILY_BONUS',
        bonusAmount,
        'UNI',
        10 // 10 минут окно для дубликатов
      );

      if (result.exists) {
        return {
          isDuplicate: true,
          message: `DAILY_BONUS уже существует для пакета "${packageName}" (${bonusAmount} UNI)`
        };
      }

      return { isDuplicate: false };
      
    } catch (error) {
      logger.error('[DeduplicationHelper] Ошибка проверки DAILY_BONUS:', error);
      return { isDuplicate: false }; // В случае ошибки разрешаем операцию
    }
  }

  /**
   * Логирует предотвращенные дубликаты для мониторинга
   * БЕЗОПАСНО: только логирование, не изменяет данные
   */
  static logPreventedDuplicate(
    userId: number,
    transactionType: string,
    amount: string | number,
    context: string
  ): void {
    logger.warn('[🛡️ DEDUPLICATION] Предотвращен дублирующий транзакция', {
      userId,
      transactionType,
      amount,
      context,
      timestamp: new Date().toISOString(),
      preventedBy: 'DeduplicationHelper'
    });
  }

  /**
   * Проверяет farming дубликаты (для будущего использования)
   * БЕЗОПАСНО: только проверка, никаких изменений
   */
  static async checkFarmingDuplicate(
    userId: number,
    farmingType: 'FARMING_DEPOSIT' | 'FARMING_REWARD',
    amount: number
  ): Promise<boolean> {
    const result = await this.checkRecentTransaction(
      userId,
      farmingType,
      amount,
      farmingType === 'FARMING_DEPOSIT' ? 'UNI' : 'UNI',
      5 // 5 минут окно для farming операций
    );

    return result.exists;
  }
}

export default DeduplicationHelper;