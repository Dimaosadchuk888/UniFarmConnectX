
import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger';
import { Transaction, TransactionsTransactionType, TransactionHistory } from './types';
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

      // Обновляем баланс пользователя после создания транзакции
      if (data.status === 'confirmed' || data.status === 'completed') {
        await this.updateUserBalanceFromTransaction(data);
      }

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

  /**
   * Обновить баланс пользователя на основе транзакции
   */
  private async updateUserBalanceFromTransaction(transaction: Transaction): Promise<void> {
    try {
      // Получаем текущий баланс пользователя
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('balance_uni, balance_ton')
        .eq('id', transaction.user_id)
        .single();

      if (userError || !user) {
        logger.error('[TransactionsService] Пользователь не найден для обновления баланса', {
          userId: transaction.user_id,
          error: userError
        });
        return;
      }

      const currentUniBalance = parseFloat(user.balance_uni || '0');
      const currentTonBalance = parseFloat(user.balance_ton || '0');
      
      let newUniBalance = currentUniBalance;
      let newTonBalance = currentTonBalance;

      // Определяем тип операции и обновляем соответствующий баланс
      const isIncome = ['FARMING_REWARD', 'farming_income', 'MISSION_REWARD', 'mission_reward', 'REFERRAL_REWARD', 'referral_bonus', 'DAILY_BONUS', 'daily_bonus', 'ton_farming_income', 'ton_boost_reward'].includes(transaction.type);
      
      // Используем поля amount_uni и amount_ton вместо общего amount
      const amountUni = parseFloat(transaction.amount_uni || transaction.amount || '0');
      const amountTon = parseFloat(transaction.amount_ton || '0');
      
      // Обновляем баланс UNI если есть изменения
      if (amountUni > 0) {
        newUniBalance = isIncome ? currentUniBalance + amountUni : currentUniBalance - amountUni;
      }
      
      // Обновляем баланс TON если есть изменения
      if (amountTon > 0) {
        newTonBalance = isIncome ? currentTonBalance + amountTon : currentTonBalance - amountTon;
      }

      // Обновляем баланс в базе данных
      const { error: updateError } = await supabase
        .from('users')
        .update({
          balance_uni: newUniBalance.toString(),
          balance_ton: newTonBalance.toString()
        })
        .eq('id', transaction.user_id);

      if (updateError) {
        logger.error('[TransactionsService] Ошибка обновления баланса пользователя', {
          userId: transaction.user_id,
          error: updateError
        });
      } else {
        logger.info('[TransactionsService] Баланс пользователя обновлён', {
          userId: transaction.user_id,
          oldUniBalance: currentUniBalance,
          newUniBalance,
          oldTonBalance: currentTonBalance,
          newTonBalance,
          transactionType: transaction.type
        });
      }
    } catch (error) {
      logger.error('[TransactionsService] Ошибка обновления баланса из транзакции:', {
        transaction,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Пересчитать баланс пользователя на основе всех транзакций
   */
  async recalculateUserBalance(userId: number): Promise<{ uni: number; ton: number }> {
    try {
      logger.info('[TransactionsService] Начинаем пересчёт баланса пользователя', { userId });

      // Получаем все подтверждённые транзакции пользователя
      const { data: transactions, error } = await supabase
        .from(TRANSACTIONS_TABLE)
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'confirmed');

      if (error) {
        logger.error('[TransactionsService] Ошибка получения транзакций для пересчёта', { error });
        return { uni: 0, ton: 0 };
      }

      let uniBalance = 0;
      let tonBalance = 0;

      // Считаем баланс на основе транзакций
      for (const tx of transactions || []) {
        const isIncome = ['farming_income', 'mission_reward', 'referral_bonus', 'daily_bonus', 'ton_farming_income', 'ton_boost_reward'].includes(tx.type);
        
        // Используем поля amount_uni и amount_ton
        const amountUni = parseFloat(tx.amount_uni || tx.amount || '0');
        const amountTon = parseFloat(tx.amount_ton || '0');
        
        // Подсчитываем баланс UNI
        if (amountUni > 0) {
          uniBalance += isIncome ? amountUni : -amountUni;
        }
        
        // Подсчитываем баланс TON
        if (amountTon > 0) {
          tonBalance += isIncome ? amountTon : -amountTon;
        }
      }

      // Обновляем баланс в базе данных
      const { error: updateError } = await supabase
        .from('users')
        .update({
          balance_uni: uniBalance.toString(),
          balance_ton: tonBalance.toString()
        })
        .eq('id', userId);

      if (updateError) {
        logger.error('[TransactionsService] Ошибка обновления пересчитанного баланса', { error: updateError });
      } else {
        logger.info('[TransactionsService] Баланс пользователя пересчитан', {
          userId,
          uniBalance,
          tonBalance,
          transactionCount: transactions?.length || 0
        });
      }

      return { uni: uniBalance, ton: tonBalance };
    } catch (error) {
      logger.error('[TransactionsService] Ошибка пересчёта баланса:', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return { uni: 0, ton: 0 };
    }
  }
}
