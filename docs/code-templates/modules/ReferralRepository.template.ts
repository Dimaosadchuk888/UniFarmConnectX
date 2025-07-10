/**
 * Referral Repository
 * Data access layer for Referral module
 */

import { supabase } from '@/core/supabaseClient';
import { logger } from '@/core/logger';
import { 
  ReferralChain,
  ReferralStats,
  ReferralEarning,
  ReferralLevel,
  TopReferrer
} from './types';

export class ReferralRepository {
  /**
   * Get referral chain for user (up to 20 levels)
   */
  async getReferralChain(userId: string): Promise<ReferralChain[]> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          id,
          user_id,
          inviter_id,
          level,
          reward_uni,
          reward_ton,
          created_at,
          inviter:users!inviter_id(
            id,
            username,
            telegram_id,
            balance_uni,
            balance_ton
          )
        `)
        .eq('user_id', userId)
        .order('level', { ascending: true });

      if (error) {
        throw error;
      }

      return data.map(ref => ({
        id: ref.id,
        user_id: ref.user_id,
        inviter_id: ref.inviter_id,
        level: ref.level,
        reward_uni: parseFloat(ref.reward_uni || '0'),
        reward_ton: parseFloat(ref.reward_ton || '0'),
        created_at: new Date(ref.created_at),
        inviter: ref.inviter
      }));
    } catch (error) {
      logger.error(`[ReferralRepository] Error getting referral chain for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get direct referrals (level 1)
   */
  async getDirectReferrals(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referred:users!user_id(
            id,
            username,
            telegram_id,
            balance_uni,
            balance_ton,
            created_at
          )
        `)
        .eq('inviter_id', userId)
        .eq('level', 1)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(`[ReferralRepository] Error getting direct referrals for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create referral relationship
   */
  async createReferral(
    userId: string,
    inviterId: string,
    level: number,
    refPath: string[]
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('referrals')
        .insert({
          user_id: userId,
          inviter_id: inviterId,
          level: level,
          ref_path: refPath,
          reward_uni: '0',
          reward_ton: '0'
        });

      if (error) {
        throw error;
      }

      logger.info(`[ReferralRepository] Created referral relationship: user ${userId} invited by ${inviterId} at level ${level}`);
      return true;
    } catch (error) {
      logger.error('[ReferralRepository] Error creating referral:', error);
      throw error;
    }
  }

  /**
   * Update referral rewards
   */
  async updateReferralRewards(
    referralId: string,
    rewardUni: number,
    rewardTon: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('referrals')
        .update({
          reward_uni: rewardUni.toString(),
          reward_ton: rewardTon.toString()
        })
        .eq('id', referralId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      logger.error(`[ReferralRepository] Error updating referral rewards for ${referralId}:`, error);
      throw error;
    }
  }

  /**
   * Get referral statistics
   */
  async getReferralStats(userId: string): Promise<ReferralStats> {
    try {
      // Get referral counts by level
      const { data: referrals, error: refError } = await supabase
        .from('referrals')
        .select('level, reward_uni, reward_ton')
        .eq('inviter_id', userId);

      if (refError) {
        throw refError;
      }

      // Get referral earnings
      const { data: earnings, error: earnError } = await supabase
        .from('referral_earnings')
        .select('amount, currency, level')
        .eq('user_id', userId);

      if (earnError) {
        throw earnError;
      }

      // Calculate statistics
      const levelCounts: Record<number, number> = {};
      const levelEarnings: Record<number, { uni: number; ton: number }> = {};
      
      for (let i = 1; i <= 20; i++) {
        levelCounts[i] = 0;
        levelEarnings[i] = { uni: 0, ton: 0 };
      }

      referrals.forEach(ref => {
        levelCounts[ref.level] = (levelCounts[ref.level] || 0) + 1;
      });

      earnings.forEach(earn => {
        if (earn.currency === 'UNI') {
          levelEarnings[earn.level].uni += parseFloat(earn.amount);
        } else if (earn.currency === 'TON') {
          levelEarnings[earn.level].ton += parseFloat(earn.amount);
        }
      });

      const totalReferrals = Object.values(levelCounts).reduce((sum, count) => sum + count, 0);
      const totalEarningsUni = earnings
        .filter(e => e.currency === 'UNI')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const totalEarningsTon = earnings
        .filter(e => e.currency === 'TON')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);

      return {
        total_referrals: totalReferrals,
        active_referrals: referrals.filter(r => r.level === 1).length,
        total_earnings_uni: totalEarningsUni,
        total_earnings_ton: totalEarningsTon,
        referrals_by_level: levelCounts,
        earnings_by_level: levelEarnings
      };
    } catch (error) {
      logger.error(`[ReferralRepository] Error getting referral stats for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Record referral earning
   */
  async recordReferralEarning(
    userId: string,
    sourceUserId: string,
    amount: number,
    currency: 'UNI' | 'TON',
    level: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('referral_earnings')
        .insert({
          user_id: userId,
          source_user_id: sourceUserId,
          amount: amount.toString(),
          currency: currency,
          level: level
        });

      if (error) {
        throw error;
      }

      logger.info(`[ReferralRepository] Recorded referral earning for user ${userId}: ${amount} ${currency} from level ${level}`);
      return true;
    } catch (error) {
      logger.error('[ReferralRepository] Error recording referral earning:', error);
      throw error;
    }
  }

  /**
   * Get top referrers
   */
  async getTopReferrers(limit: number = 10): Promise<TopReferrer[]> {
    try {
      // Get referral counts
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          inviter_id,
          inviter:users!inviter_id(
            id,
            username,
            telegram_id
          )
        `)
        .eq('level', 1);

      if (error) {
        throw error;
      }

      // Count referrals per inviter
      const referralCounts: Record<string, { count: number; user: any }> = {};
      
      data.forEach(ref => {
        const inviterId = ref.inviter_id;
        if (!referralCounts[inviterId]) {
          referralCounts[inviterId] = {
            count: 0,
            user: ref.inviter
          };
        }
        referralCounts[inviterId].count++;
      });

      // Sort and limit
      const topReferrers = Object.entries(referralCounts)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, limit)
        .map(([inviterId, data]) => ({
          user_id: inviterId,
          username: data.user?.username || 'Unknown',
          referral_count: data.count,
          total_earnings_uni: 0, // TODO: Calculate from referral_earnings
          total_earnings_ton: 0
        }));

      return topReferrers;
    } catch (error) {
      logger.error('[ReferralRepository] Error getting top referrers:', error);
      throw error;
    }
  }

  /**
   * Check if referral exists
   */
  async referralExists(userId: string, inviterId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('inviter_id', inviterId);

      if (error) {
        throw error;
      }

      return (count || 0) > 0;
    } catch (error) {
      logger.error(`[ReferralRepository] Error checking referral existence:`, error);
      throw error;
    }
  }

  /**
   * Build full referral chain up to 20 levels
   */
  async buildReferralChain(userId: string, maxLevel: number = 20): Promise<string[]> {
    try {
      const chain: string[] = [];
      let currentUserId = userId;
      
      for (let level = 1; level <= maxLevel; level++) {
        // Get parent referrer
        const { data, error } = await supabase
          .from('users')
          .select('referred_by')
          .eq('id', currentUserId)
          .single();

        if (error || !data?.referred_by) {
          break;
        }

        chain.push(data.referred_by.toString());
        currentUserId = data.referred_by.toString();
      }

      return chain;
    } catch (error) {
      logger.error(`[ReferralRepository] Error building referral chain for user ${userId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const referralRepository = new ReferralRepository();