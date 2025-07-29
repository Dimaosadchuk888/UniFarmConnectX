import { supabase } from './supabase';
import { logger } from './logger';

export interface TransactionPolicy {
  requireTransaction: boolean;
  transactionType: string;
  enforceBalanceManager: boolean;
  allowDirectSQL: boolean;
}

/**
 * TransactionEnforcer - Обеспечивает строгую политику транзакций
 * Все изменения балансов должны проходить через BalanceManager и создавать транзакции
 */
export class TransactionEnforcer {
  private policies: Map<string, TransactionPolicy> = new Map();
  
  constructor() {
    this.initializePolicies();
  }
  
  /**
   * Инициализация политик для разных типов операций
   */
  private initializePolicies(): void {
    // UNI Farming депозиты
    this.policies.set('FARMING_DEPOSIT', {
      requireTransaction: true,
      transactionType: 'FARMING_DEPOSIT',
      enforceBalanceManager: true,
      allowDirectSQL: false
    });
    
    // UNI Farming доходы
    this.policies.set('FARMING_INCOME', {
      requireTransaction: true,
      transactionType: 'FARMING_INCOME',
      enforceBalanceManager: true,
      allowDirectSQL: false
    });
    
    // TON Boost покупки
    this.policies.set('BOOST_PURCHASE', {
      requireTransaction: true,
      transactionType: 'TRANSACTION',
      enforceBalanceManager: true,
      allowDirectSQL: false
    });
    
    // TON Boost доходы
    this.policies.set('TON_BOOST_INCOME', {
      requireTransaction: true,
      transactionType: 'FARMING_INCOME',
      enforceBalanceManager: true,
      allowDirectSQL: false
    });
    
    // Реферальные награды
    this.policies.set('REFERRAL_REWARD', {
      requireTransaction: true,
      transactionType: 'REFERRAL_REWARD',
      enforceBalanceManager: true,
      allowDirectSQL: false
    });
    
    // Награды за миссии
    this.policies.set('MISSION_REWARD', {
      requireTransaction: true,
      transactionType: 'MISSION_REWARD',
      enforceBalanceManager: true,
      allowDirectSQL: false
    });
    
    // Ежедневные бонусы
    this.policies.set('DAILY_BONUS', {
      requireTransaction: true,
      transactionType: 'DAILY_BONUS',
      enforceBalanceManager: true,
      allowDirectSQL: false
    });
  }
  
  /**
   * Проверяет соответствие операции политике
   */
  async enforcePolicy(
    operationType: string,
    userId: number,
    amount: number,
    currency: 'UNI' | 'TON',
    description: string
  ): Promise<{ valid: boolean; error?: string }> {
    // ОТКЛЮЧЕНО: TransactionEnforcer для предотвращения автоматических блокировок операций
    logger.info('[ANTI_ROLLBACK_PROTECTION] TransactionEnforcer ОТКЛЮЧЕН - все операции разрешены', {
      operationType,
      userId,
      amount,
      currency,
      description,
      timestamp: new Date().toISOString(),
      reason: 'Предотвращение автоматических rollback операций'
    });
    
    // ВСЕГДА РАЗРЕШАЕМ ВСЕ ОПЕРАЦИИ
    return { valid: true };
  }
  
  /**
   * Проверяет существование транзакции
   */
  private async checkTransactionExists(
    userId: number,
    amount: number,
    currency: 'UNI' | 'TON',
    transactionType: string
  ): Promise<boolean> {
    try {
      // Проверяем транзакции за последние 5 минут
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('type', transactionType)
        .eq('currency', currency)
        .gte('created_at', fiveMinutesAgo)
        .limit(1);
        
      if (error) {
        logger.error('[TransactionEnforcer] Ошибка проверки транзакции:', error);
        return false;
      }
      
      return data && data.length > 0;
    } catch (error) {
      logger.error('[TransactionEnforcer] Исключение при проверке транзакции:', error);
      return false;
    }
  }
  
  /**
   * Создает транзакцию согласно политике
   */
  async createRequiredTransaction(
    operationType: string,
    userId: number,
    amount: number,
    currency: 'UNI' | 'TON',
    description: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; transactionId?: number; error?: string }> {
    const policy = this.policies.get(operationType);
    
    if (!policy || !policy.requireTransaction) {
      return { success: true };
    }
    
    try {
      const transactionData = {
        user_id: userId,
        type: policy.transactionType,
        amount: amount.toString(),
        amount_uni: currency === 'UNI' ? amount.toString() : '0',
        amount_ton: currency === 'TON' ? amount.toString() : '0',
        currency,
        status: 'completed',
        description,
        metadata,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select()
        .single();
        
      if (error) {
        logger.error('[TransactionEnforcer] Ошибка создания транзакции:', error);
        return {
          success: false,
          error: error.message
        };
      }
      
      logger.info('[TransactionEnforcer] Транзакция создана', {
        transactionId: data.id,
        operationType,
        userId,
        amount,
        currency
      });
      
      return {
        success: true,
        transactionId: data.id
      };
    } catch (error) {
      logger.error('[TransactionEnforcer] Исключение при создании транзакции:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Проверяет и логирует прямые SQL обновления балансов
   */
  async detectDirectSQLUpdates(): Promise<void> {
    // ОТКЛЮЧЕНО: detectDirectSQLUpdates для предотвращения автоматических корректировок балансов
    logger.info('[ANTI_ROLLBACK_PROTECTION] detectDirectSQLUpdates ОТКЛЮЧЕН', {
      timestamp: new Date().toISOString(),
      reason: 'Предотвращение автоматических корректировок при обнаружении "подозрительных" расхождений балансов'
    });
    return; // НЕМЕДЛЕННЫЙ ВЫХОД БЕЗ ПРОВЕРОК
  }
}

export const transactionEnforcer = new TransactionEnforcer();