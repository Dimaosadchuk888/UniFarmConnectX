
import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger';
import { Transaction, TransactionType, TransactionHistory } from './types';
import { TRANSACTIONS_TABLE } from './model';

export class TransactionsService {
  /**
   * Отримати історію транзакцій користувача
   */
  async getTransactionHistory(
    userId: string, 
    page: number = 1, 
    limit: number = 20,
    currency?: string
  ): Promise<TransactionHistory> {
    try {
      logger.info(`[TransactionsService] Получение истории транзакций для пользователя ${userId}`, {
        userId,
        page,
        limit,
        currency
      });

      const offset = (page - 1) * limit;
      
      let query = supabase
        .from(TRANSACTIONS_TABLE)
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (currency && currency !== 'ALL') {
        query = query.eq('currency', currency);
      }

      const { data: transactions, error, count } = await query;

      if (error) {
        logger.error('[TransactionsService] Ошибка получения транзакций:', error);
        throw error;
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);
      const hasMore = page < totalPages;

      return {
        transactions: transactions || [],
        total,
        page,
        limit,
        totalPages,
        hasMore
      };
    } catch (error) {
      logger.error('[TransactionsService] Ошибка получения истории транзакций:', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        transactions: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        hasMore: false
      };
    }
  }

  /**
   * Создать новую транзакцию
   */
  async createTransaction(transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction | null> {
    try {
      logger.info('[TransactionsService] Создание новой транзакции', {
        userId: transaction.user_id,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency
      });

      const { data, error } = await supabase
        .from(TRANSACTIONS_TABLE)
        .insert([{
          ...transaction,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        logger.error('[TransactionsService] Ошибка создания транзакции:', error);
        throw error;
      }

      logger.info('[TransactionsService] Транзакция успешно создана', {
        transactionId: data.id,
        userId: transaction.user_id,
        type: transaction.type
      });

      return data;
    } catch (error) {
      logger.error('[TransactionsService] Ошибка создания транзакции:', {
        transaction,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Получить транзакцию по ID
   */
  async getTransactionById(transactionId: number): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from(TRANSACTIONS_TABLE)
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error) {
        logger.error('[TransactionsService] Ошибка получения транзакции по ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('[TransactionsService] Ошибка получения транзакции:', {
        transactionId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Получить общую статистику транзакций пользователя
   */
  async getTransactionStats(userId: string): Promise<{
    totalTransactions: number;
    totalIncome: { UNI: string; TON: string };
    totalOutcome: { UNI: string; TON: string };
  }> {
    try {
      const { data: transactions, error } = await supabase
        .from(TRANSACTIONS_TABLE)
        .select('type, amount, currency')
        .eq('user_id', userId);

      if (error) {
        logger.error('[TransactionsService] Ошибка получения статистики:', error);
        throw error;
      }

      const stats = {
        totalTransactions: transactions?.length || 0,
        totalIncome: { UNI: '0', TON: '0' },
        totalOutcome: { UNI: '0', TON: '0' }
      };

      transactions?.forEach(tx => {
        const amount = parseFloat(tx.amount || '0');
        const currency = tx.currency || 'UNI';
        
        if (['farming_income', 'referral_bonus', 'mission_reward', 'daily_bonus'].includes(tx.type)) {
          if (currency === 'UNI') {
            stats.totalIncome.UNI = (parseFloat(stats.totalIncome.UNI) + amount).toString();
          } else if (currency === 'TON') {
            stats.totalIncome.TON = (parseFloat(stats.totalIncome.TON) + amount).toString();
          }
        } else if (['withdrawal', 'boost_purchase'].includes(tx.type)) {
          if (currency === 'UNI') {
            stats.totalOutcome.UNI = (parseFloat(stats.totalOutcome.UNI) + amount).toString();
          } else if (currency === 'TON') {
            stats.totalOutcome.TON = (parseFloat(stats.totalOutcome.TON) + amount).toString();
          }
        }
      });

      return stats;
    } catch (error) {
      logger.error('[TransactionsService] Ошибка получения статистики транзакций:', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        totalTransactions: 0,
        totalIncome: { UNI: '0', TON: '0' },
        totalOutcome: { UNI: '0', TON: '0' }
      };
    }
  }
}
