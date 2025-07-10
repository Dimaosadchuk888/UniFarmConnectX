/**
 * Wallet Repository
 * Data access layer for Wallet module
 */

import { supabase } from '@/core/supabaseClient';
import { logger } from '@/core/logger';
import { 
  WalletBalance,
  WalletTransaction,
  WalletStats,
  TransactionFilter
} from './types';

export class WalletRepository {
  /**
   * Get user wallet balance
   */
  async getBalance(userId: string): Promise<WalletBalance | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, balance_uni, balance_ton, ton_wallet_address')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return {
        user_id: data.id,
        balance_uni: parseFloat(data.balance_uni || '0'),
        balance_ton: parseFloat(data.balance_ton || '0'),
        ton_wallet_address: data.ton_wallet_address
      };
    } catch (error) {
      logger.error(`[WalletRepository] Error getting balance for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user balance
   */
  async updateBalance(
    userId: string, 
    balanceUni?: number, 
    balanceTon?: number
  ): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (balanceUni !== undefined) {
        updateData.balance_uni = balanceUni.toString();
      }
      
      if (balanceTon !== undefined) {
        updateData.balance_ton = balanceTon.toString();
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        throw error;
      }

      logger.info(`[WalletRepository] Updated balance for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`[WalletRepository] Error updating balance for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get wallet transactions
   */
  async getTransactions(
    userId: string,
    filter: TransactionFilter
  ): Promise<WalletTransaction[]> {
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId);

      // Apply filters
      if (filter.currency) {
        query = query.eq('currency', filter.currency);
      }

      if (filter.type) {
        query = query.eq('transaction_type', filter.type);
      }

      if (filter.status) {
        query = query.eq('status', filter.status);
      }

      if (filter.startDate) {
        query = query.gte('created_at', filter.startDate.toISOString());
      }

      if (filter.endDate) {
        query = query.lte('created_at', filter.endDate.toISOString());
      }

      // Sorting and pagination
      query = query
        .order('created_at', { ascending: false })
        .range(
          filter.offset || 0, 
          (filter.offset || 0) + (filter.limit || 10) - 1
        );

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data.map(tx => ({
        id: tx.id,
        user_id: tx.user_id,
        type: tx.transaction_type,
        currency: tx.currency,
        amount: parseFloat(tx.amount || '0'),
        status: tx.status,
        description: tx.description,
        created_at: new Date(tx.created_at)
      }));
    } catch (error) {
      logger.error(`[WalletRepository] Error getting transactions for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create transaction record
   */
  async createTransaction(transaction: Omit<WalletTransaction, 'id'>): Promise<WalletTransaction> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: transaction.user_id,
          transaction_type: transaction.type,
          currency: transaction.currency,
          amount: transaction.amount.toString(),
          status: transaction.status || 'completed',
          description: transaction.description,
          source: transaction.source,
          category: transaction.category,
          source_user_id: transaction.source_user_id
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info(`[WalletRepository] Created transaction ${data.id} for user ${transaction.user_id}`);

      return {
        id: data.id,
        user_id: data.user_id,
        type: data.transaction_type,
        currency: data.currency,
        amount: parseFloat(data.amount),
        status: data.status,
        description: data.description,
        source: data.source,
        category: data.category,
        source_user_id: data.source_user_id,
        created_at: new Date(data.created_at)
      };
    } catch (error) {
      logger.error('[WalletRepository] Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Update TON wallet address
   */
  async updateTonWalletAddress(userId: string, address: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ton_wallet_address: address,
          ton_wallet_verified: true,
          ton_wallet_linked_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      logger.info(`[WalletRepository] Updated TON wallet address for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`[WalletRepository] Error updating TON wallet for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(userId: string): Promise<WalletStats> {
    try {
      // Get transaction summary
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('transaction_type, currency, amount')
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      const stats: WalletStats = {
        total_deposits_uni: 0,
        total_deposits_ton: 0,
        total_withdrawals_uni: 0,
        total_withdrawals_ton: 0,
        total_rewards_uni: 0,
        total_rewards_ton: 0,
        transaction_count: transactions.length
      };

      // Calculate statistics
      transactions.forEach(tx => {
        const amount = parseFloat(tx.amount || '0');
        const isUni = tx.currency === 'UNI';
        const isTon = tx.currency === 'TON';

        switch (tx.transaction_type) {
          case 'DEPOSIT':
            if (isUni) stats.total_deposits_uni += amount;
            if (isTon) stats.total_deposits_ton += amount;
            break;
          case 'WITHDRAWAL':
            if (isUni) stats.total_withdrawals_uni += amount;
            if (isTon) stats.total_withdrawals_ton += amount;
            break;
          case 'FARMING_REWARD':
          case 'REFERRAL_REWARD':
          case 'MISSION_REWARD':
          case 'DAILY_BONUS':
            if (isUni) stats.total_rewards_uni += amount;
            if (isTon) stats.total_rewards_ton += amount;
            break;
        }
      });

      return stats;
    } catch (error) {
      logger.error(`[WalletRepository] Error getting wallet stats for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create withdrawal request
   */
  async createWithdrawalRequest(
    userId: string,
    amount: number,
    currency: 'UNI' | 'TON',
    walletAddress: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('withdraw_requests')
        .insert({
          user_id: userId,
          amount_uni: currency === 'UNI' ? amount.toString() : '0',
          amount_ton: currency === 'TON' ? amount.toString() : '0',
          wallet_address: walletAddress,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info(`[WalletRepository] Created withdrawal request ${data.id} for user ${userId}`);
      return data.id;
    } catch (error) {
      logger.error('[WalletRepository] Error creating withdrawal request:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const walletRepository = new WalletRepository();