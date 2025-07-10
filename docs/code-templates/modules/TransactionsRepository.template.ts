/**
 * Repository для модуля Transactions
 * Управление транзакциями и историей операций
 */

import { BaseRepository } from '../BaseRepository';
import { supabase } from '../../core/supabase';
import { Transaction, InsertTransaction } from '../../shared/schema';
import { logger } from '../../utils/logger';

export class TransactionsRepository extends BaseRepository<Transaction> {
  constructor() {
    super('transactions');
  }

  /**
   * Создать транзакцию
   */
  async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...transactionData,
          created_at: transactionData.created_at || new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Получить транзакции пользователя
   */
  async getUserTransactions(
    userId: number,
    options: {
      limit?: number;
      offset?: number;
      type?: string;
      currency?: string;
      status?: string;
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ): Promise<{
    transactions: Transaction[];
    total: number;
  }> {
    try {
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Применяем фильтры
      if (options.type) {
        query = query.eq('transaction_type', options.type);
      }
      if (options.currency) {
        query = query.eq('currency', options.currency);
      }
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.fromDate) {
        query = query.gte('created_at', options.fromDate.toISOString());
      }
      if (options.toDate) {
        query = query.lte('created_at', options.toDate.toISOString());
      }

      // Сортировка и пагинация
      query = query
        .order('created_at', { ascending: false })
        .range(
          options.offset || 0,
          (options.offset || 0) + (options.limit || 50) - 1
        );

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        transactions: data || [],
        total: count || 0
      };
    } catch (error) {
      logger.error('Error fetching user transactions:', error);
      throw error;
    }
  }

  /**
   * Получить транзакции по типу
   */
  async getTransactionsByType(
    type: string,
    limit: number = 100
  ): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_type', type)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching transactions by type:', error);
      throw error;
    }
  }

  /**
   * Получить статистику транзакций пользователя
   */
  async getUserTransactionStats(userId: number): Promise<{
    totalDeposits: { uni: number; ton: number };
    totalWithdrawals: { uni: number; ton: number };
    totalRewards: { uni: number; ton: number };
    totalReferralEarnings: { uni: number; ton: number };
    transactionCount: number;
  }> {
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('transaction_type, currency, amount')
        .eq('user_id', userId)
        .eq('status', 'confirmed');

      if (error) throw error;

      const stats = {
        totalDeposits: { uni: 0, ton: 0 },
        totalWithdrawals: { uni: 0, ton: 0 },
        totalRewards: { uni: 0, ton: 0 },
        totalReferralEarnings: { uni: 0, ton: 0 },
        transactionCount: transactions?.length || 0
      };

      transactions?.forEach(tx => {
        const amount = parseFloat(tx.amount || '0');
        const currency = tx.currency?.toLowerCase() as 'uni' | 'ton';

        switch (tx.transaction_type) {
          case 'DEPOSIT':
          case 'FARMING_DEPOSIT':
          case 'BOOST_PURCHASE':
            stats.totalDeposits[currency] += amount;
            break;
          case 'WITHDRAWAL':
            stats.totalWithdrawals[currency] += amount;
            break;
          case 'FARMING_REWARD':
          case 'BOOST_REWARD':
          case 'MISSION_REWARD':
          case 'DAILY_BONUS':
          case 'AIRDROP_CLAIM':
            stats.totalRewards[currency] += amount;
            break;
          case 'REFERRAL_REWARD':
            stats.totalReferralEarnings[currency] += amount;
            break;
        }
      });

      return stats;
    } catch (error) {
      logger.error('Error fetching transaction stats:', error);
      throw error;
    }
  }

  /**
   * Получить глобальную статистику транзакций
   */
  async getGlobalTransactionStats(): Promise<{
    totalVolume: { uni: number; ton: number };
    transactionCount: number;
    activeUsers: number;
    avgTransactionSize: { uni: number; ton: number };
  }> {
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('user_id, currency, amount')
        .eq('status', 'confirmed');

      if (error) throw error;

      const stats = {
        totalVolume: { uni: 0, ton: 0 },
        transactionCount: transactions?.length || 0,
        activeUsers: 0,
        avgTransactionSize: { uni: 0, ton: 0 }
      };

      const uniqueUsers = new Set<number>();
      let uniCount = 0;
      let tonCount = 0;

      transactions?.forEach(tx => {
        const amount = parseFloat(tx.amount || '0');
        const currency = tx.currency?.toLowerCase() as 'uni' | 'ton';

        stats.totalVolume[currency] += amount;
        uniqueUsers.add(tx.user_id!);

        if (currency === 'uni') uniCount++;
        else if (currency === 'ton') tonCount++;
      });

      stats.activeUsers = uniqueUsers.size;
      stats.avgTransactionSize.uni = uniCount > 0 
        ? stats.totalVolume.uni / uniCount 
        : 0;
      stats.avgTransactionSize.ton = tonCount > 0 
        ? stats.totalVolume.ton / tonCount 
        : 0;

      return stats;
    } catch (error) {
      logger.error('Error fetching global transaction stats:', error);
      throw error;
    }
  }

  /**
   * Создать массовые транзакции (для реферальных выплат)
   */
  async createBatchTransactions(
    transactions: InsertTransaction[]
  ): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert(
          transactions.map(tx => ({
            ...tx,
            created_at: tx.created_at || new Date().toISOString()
          }))
        )
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error creating batch transactions:', error);
      throw error;
    }
  }

  /**
   * Обновить статус транзакции
   */
  async updateTransactionStatus(
    transactionId: number,
    status: 'pending' | 'confirmed' | 'rejected',
    txHash?: string
  ): Promise<Transaction | null> {
    try {
      const updateData: any = { status };
      if (txHash) updateData.tx_hash = txHash;

      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating transaction status:', error);
      throw error;
    }
  }

  /**
   * Получить pending транзакции (для обработки)
   */
  async getPendingTransactions(limit: number = 100): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching pending transactions:', error);
      throw error;
    }
  }

  /**
   * Поиск транзакций по хешу
   */
  async findByTxHash(txHash: string): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('tx_hash', txHash)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error finding transaction by hash:', error);
      throw error;
    }
  }
}

export const transactionsRepository = new TransactionsRepository();