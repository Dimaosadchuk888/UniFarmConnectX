/**
 * Farming Repository
 * Data access layer for Farming module
 */

import { supabase } from '@/core/supabaseClient';
import { logger } from '@/core/logger';
import { 
  FarmingDeposit,
  FarmingSession,
  FarmingStats,
  CreateFarmingDepositData,
  FarmingReward
} from './types';

export class FarmingRepository {
  /**
   * Get active farming deposits for user
   */
  async getActiveDeposits(userId: string): Promise<FarmingDeposit[]> {
    try {
      const { data, error } = await supabase
        .from('farming_deposits')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map(deposit => ({
        id: deposit.id,
        user_id: deposit.user_id,
        amount_uni: parseFloat(deposit.amount_uni || '0'),
        rate_uni: parseFloat(deposit.rate_uni || '0'),
        rate_ton: parseFloat(deposit.rate_ton || '0'),
        created_at: new Date(deposit.created_at),
        last_claim: deposit.last_claim ? new Date(deposit.last_claim) : null,
        is_boosted: deposit.is_boosted,
        deposit_type: deposit.deposit_type,
        boost_id: deposit.boost_id,
        expires_at: deposit.expires_at ? new Date(deposit.expires_at) : null
      }));
    } catch (error) {
      logger.error(`[FarmingRepository] Error getting active deposits for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create farming deposit
   */
  async createDeposit(data: CreateFarmingDepositData): Promise<FarmingDeposit> {
    try {
      const { data: created, error } = await supabase
        .from('farming_deposits')
        .insert({
          user_id: data.user_id,
          amount_uni: data.amount_uni.toString(),
          rate_uni: data.rate_uni.toString(),
          rate_ton: data.rate_ton?.toString() || '0',
          is_boosted: data.is_boosted || false,
          deposit_type: data.deposit_type || 'regular',
          boost_id: data.boost_id,
          expires_at: data.expires_at?.toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info(`[FarmingRepository] Created farming deposit ${created.id} for user ${data.user_id}`);

      return {
        id: created.id,
        user_id: created.user_id,
        amount_uni: parseFloat(created.amount_uni),
        rate_uni: parseFloat(created.rate_uni),
        rate_ton: parseFloat(created.rate_ton || '0'),
        created_at: new Date(created.created_at),
        last_claim: null,
        is_boosted: created.is_boosted,
        deposit_type: created.deposit_type,
        boost_id: created.boost_id,
        expires_at: created.expires_at ? new Date(created.expires_at) : null
      };
    } catch (error) {
      logger.error('[FarmingRepository] Error creating farming deposit:', error);
      throw error;
    }
  }

  /**
   * Update last claim time
   */
  async updateLastClaim(depositId: string, claimTime: Date): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('farming_deposits')
        .update({
          last_claim: claimTime.toISOString()
        })
        .eq('id', depositId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      logger.error(`[FarmingRepository] Error updating last claim for deposit ${depositId}:`, error);
      throw error;
    }
  }

  /**
   * Deactivate farming deposit
   */
  async deactivateDeposit(depositId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('farming_deposits')
        .update({
          is_active: false
        })
        .eq('id', depositId);

      if (error) {
        throw error;
      }

      logger.info(`[FarmingRepository] Deactivated farming deposit ${depositId}`);
      return true;
    } catch (error) {
      logger.error(`[FarmingRepository] Error deactivating deposit ${depositId}:`, error);
      throw error;
    }
  }

  /**
   * Get farming stats for user
   */
  async getFarmingStats(userId: string): Promise<FarmingStats> {
    try {
      // Get all deposits
      const { data: deposits, error: depositsError } = await supabase
        .from('farming_deposits')
        .select('*')
        .eq('user_id', userId);

      if (depositsError) {
        throw depositsError;
      }

      // Get farming rewards from transactions
      const { data: rewards, error: rewardsError } = await supabase
        .from('transactions')
        .select('amount, currency')
        .eq('user_id', userId)
        .eq('transaction_type', 'FARMING_REWARD');

      if (rewardsError) {
        throw rewardsError;
      }

      // Calculate stats
      const activeDeposits = deposits.filter(d => d.is_active);
      const totalDepositedUni = deposits.reduce((sum, d) => sum + parseFloat(d.amount_uni || '0'), 0);
      const totalEarnedUni = rewards
        .filter(r => r.currency === 'UNI')
        .reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
      const totalEarnedTon = rewards
        .filter(r => r.currency === 'TON')
        .reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);

      return {
        total_deposits: deposits.length,
        active_deposits: activeDeposits.length,
        total_deposited_uni: totalDepositedUni,
        total_earned_uni: totalEarnedUni,
        total_earned_ton: totalEarnedTon,
        average_rate_uni: activeDeposits.length > 0
          ? activeDeposits.reduce((sum, d) => sum + parseFloat(d.rate_uni || '0'), 0) / activeDeposits.length
          : 0
      };
    } catch (error) {
      logger.error(`[FarmingRepository] Error getting farming stats for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get UNI farming deposits
   */
  async getUniFarmingDeposits(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('uni_farming_deposits')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(`[FarmingRepository] Error getting UNI farming deposits for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update UNI farming balance in users table
   */
  async updateUniFarmingBalance(userId: string, balance: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          uni_farming_balance: balance.toString(),
          uni_farming_last_update: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      logger.error(`[FarmingRepository] Error updating UNI farming balance for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get farming deposits that need rewards calculation
   */
  async getDepositsForRewardCalculation(lastUpdateBefore: Date): Promise<FarmingDeposit[]> {
    try {
      const { data, error } = await supabase
        .from('farming_deposits')
        .select('*')
        .eq('is_active', true)
        .or(`last_claim.is.null,last_claim.lt.${lastUpdateBefore.toISOString()}`);

      if (error) {
        throw error;
      }

      return data.map(deposit => ({
        id: deposit.id,
        user_id: deposit.user_id,
        amount_uni: parseFloat(deposit.amount_uni || '0'),
        rate_uni: parseFloat(deposit.rate_uni || '0'),
        rate_ton: parseFloat(deposit.rate_ton || '0'),
        created_at: new Date(deposit.created_at),
        last_claim: deposit.last_claim ? new Date(deposit.last_claim) : null,
        is_boosted: deposit.is_boosted,
        deposit_type: deposit.deposit_type,
        boost_id: deposit.boost_id,
        expires_at: deposit.expires_at ? new Date(deposit.expires_at) : null
      }));
    } catch (error) {
      logger.error('[FarmingRepository] Error getting deposits for reward calculation:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const farmingRepository = new FarmingRepository();