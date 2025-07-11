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
    const policy = this.policies.get(operationType);
    
    if (!policy) {
      logger.warn('[TransactionEnforcer] Неизвестный тип операции:', operationType);
      return { valid: true }; // Разрешаем неизвестные операции
    }
    
    // Проверяем наличие транзакции
    if (policy.requireTransaction) {
      const hasTransaction = await this.checkTransactionExists(
        userId,
        amount,
        currency,
        policy.transactionType
      );
      
      if (!hasTransaction) {
        logger.error('[TransactionEnforcer] Транзакция не создана для операции', {
          operationType,
          userId,
          amount,
          currency
        });
        return {
          valid: false,
          error: `Требуется создание транзакции типа ${policy.transactionType}`
        };
      }
    }
    
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
    try {
      // Получаем последние изменения балансов
      const { data: users, error } = await supabase
        .from('users')
        .select('id, balance_uni, balance_ton, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10);
        
      if (error || !users) {
        return;
      }
      
      // Проверяем каждого пользователя
      for (const user of users) {
        // Суммируем транзакции
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount_uni, amount_ton, type')
          .eq('user_id', user.id);
          
        if (!transactions) continue;
        
        let transactionSumUni = 0;
        let transactionSumTon = 0;
        
        transactions.forEach(tx => {
          const uniAmount = parseFloat(tx.amount_uni || '0');
          const tonAmount = parseFloat(tx.amount_ton || '0');
          
          // Депозиты и покупки вычитаются
          if (tx.type === 'FARMING_DEPOSIT' || tx.type === 'TRANSACTION') {
            transactionSumUni -= Math.abs(uniAmount);
            transactionSumTon -= Math.abs(tonAmount);
          } else {
            // Все остальное прибавляется
            transactionSumUni += uniAmount;
            transactionSumTon += tonAmount;
          }
        });
        
        const balanceDiffUni = parseFloat(user.balance_uni || '0') - transactionSumUni;
        const balanceDiffTon = parseFloat(user.balance_ton || '0') - transactionSumTon;
        
        // Если разница больше 1 (для погрешности), логируем
        if (Math.abs(balanceDiffUni) > 1 || Math.abs(balanceDiffTon) > 1) {
          logger.warn('[TransactionEnforcer] Обнаружено расхождение баланса', {
            userId: user.id,
            balanceUni: user.balance_uni,
            transactionSumUni,
            diffUni: balanceDiffUni,
            balanceTon: user.balance_ton,
            transactionSumTon,
            diffTon: balanceDiffTon
          });
        }
      }
    } catch (error) {
      logger.error('[TransactionEnforcer] Ошибка при проверке прямых SQL обновлений:', error);
    }
  }
}

export const transactionEnforcer = new TransactionEnforcer();