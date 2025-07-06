import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger.js';
import { DAILY_BONUS_TABLES, DAILY_BONUS_CONFIG, BONUS_TYPES } from './model';

export class DailyBonusService {
  /**
   * Get daily bonus information for a user
   */
  async getDailyBonusInfo(userId: string): Promise<{
    can_claim: boolean;
    streak_days: number;
    next_bonus_amount: string;
    last_claim_date: string | null;
  }> {
    try {
      logger.info('[DailyBonusService] Получен userId:', { userId, type: typeof userId });
      
      // Проверяем корректность userId перед parseInt
      if (!userId || userId === 'undefined' || userId === 'null') {
        logger.error('[DailyBonusService] Пустой или некорректный userId:', userId);
        throw new Error('ID пользователя не предоставлен');
      }
      
      const userIdNumber = parseInt(userId);
      if (isNaN(userIdNumber)) {
        logger.error('[DailyBonusService] Некорректный формат userId:', userId);
        throw new Error('Некорректный формат ID пользователя');
      }

      const { data: users, error } = await supabase
        .from(DAILY_BONUS_TABLES.USERS)
        .select('*')
        .eq('id', userIdNumber)
        .limit(1);

      if (error) {
        logger.error('[DailyBonusService] Ошибка получения пользователя:', error.message);
        throw error;
      }

      const user = users?.[0];

      if (!user) {
        return {
          can_claim: false,
          streak_days: 0,
          next_bonus_amount: "500",
          last_claim_date: null
        };
      }

      const now = new Date();
      const lastClaimDate = user.checkin_last_date ? new Date(user.checkin_last_date) : null;
      
      let canClaim = true;
      let streakDays = user.checkin_streak || 0;
      
      if (lastClaimDate) {
        const daysSinceLastClaim = Math.floor((now.getTime() - lastClaimDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastClaim < 1) {
          canClaim = false; // Already claimed today
        } else if (daysSinceLastClaim > 1) {
          streakDays = 0; // Streak broken
        }
      }

      const nextBonusAmount = this.calculateBonusAmount(streakDays + (canClaim ? 1 : 0));

      return {
        can_claim: canClaim,
        streak_days: streakDays,
        next_bonus_amount: nextBonusAmount,
        last_claim_date: lastClaimDate ? lastClaimDate.toISOString() : null
      };
    } catch (error) {
      logger.error('[DailyBonusService] Ошибка получения информации о ежедневном бонусе', { userId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Claim daily bonus for a user
   */
  async claimDailyBonus(userId: string): Promise<{
    success: boolean;
    amount?: string;
    streak_days?: number;
    error?: string;
  }> {
    try {
      // Проверяем корректность userId перед parseInt
      const userIdNumber = parseInt(userId);
      if (isNaN(userIdNumber)) {
        logger.error('[DailyBonusService] Некорректный userId в claimDailyBonus:', userId);
        return {
          success: false,
          error: 'Некорректный ID пользователя'
        };
      }

      const { data: users, error } = await supabase
        .from(DAILY_BONUS_TABLES.USERS)
        .select('*')
        .eq('id', userIdNumber)
        .limit(1);

      if (error || !users?.[0]) {
        return {
          success: false,
          error: 'Пользователь не найден'
        };
      }

      const user = users[0];
      const now = new Date();
      const lastClaimDate = user.checkin_last_date ? new Date(user.checkin_last_date) : null;
      
      // Check if user can claim today
      if (lastClaimDate) {
        const daysSinceLastClaim = Math.floor((now.getTime() - lastClaimDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastClaim < 1) {
          return {
            success: false,
            error: 'Ежедневный бонус уже получен сегодня'
          };
        }
      }

      // Calculate new streak
      let newStreak = 1;
      if (lastClaimDate) {
        const daysSinceLastClaim = Math.floor((now.getTime() - lastClaimDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastClaim === 1) {
          newStreak = (user.checkin_streak || 0) + 1;
        }
      }

      const bonusAmount = this.calculateBonusAmount(newStreak);
      
      // Update balance through centralized BalanceManager
      const { balanceManager } = await import('../../core/BalanceManager');
      const result = await balanceManager.addBalance(
        userIdNumber,
        parseFloat(bonusAmount),
        0,
        'DailyBonusService.claim'
      );

      if (!result.success) {
        logger.error('[DailyBonusService] Ошибка обновления баланса:', result.error);
        return { success: false, message: result.error || 'Ошибка начисления бонуса' };
      }

      // Update streak and last claim date separately
      const { error: updateError } = await supabase
        .from(DAILY_BONUS_TABLES.USERS)
        .update({
          checkin_last_date: now.toISOString(),
          checkin_streak: newStreak
        })
        .eq('id', userIdNumber);

      if (updateError) {
        logger.error('[DailyBonusService] Ошибка обновления пользователя:', updateError.message);
        return {
          success: false,
          error: 'Ошибка начисления бонуса'
        };
      }

      // Create transaction record
      const { error: txError } = await supabase
        .from(DAILY_BONUS_TABLES.TRANSACTIONS)
        .insert([{
          user_id: userIdNumber,
          type: 'DAILY_BONUS',
          amount_uni: parseFloat(bonusAmount),
          amount_ton: 0,
          description: `Daily bonus day ${newStreak}`,
          created_at: now.toISOString()
        }]);

      if (txError) {
        logger.warn('[DailyBonusService] Ошибка создания транзакции:', txError.message);
      }

      // Записываем в daily_bonus_history
      await supabase
        .from('daily_bonus_history')
        .insert({
          user_id: userIdNumber,
          bonus_amount: parseFloat(bonusAmount),
          streak_day: newStreak,
          claimed_at: now.toISOString(),
          bonus_type: 'DAILY_CHECKIN',
          previous_balance: currentBalance,
          new_balance: newBalance,
          created_at: now.toISOString()
        });

      logger.info('[DailyBonusService] Ежедневный бонус начислен', {
        userId,
        amount: bonusAmount,
        streak: newStreak,
        newBalance: newBalance.toFixed(6)
      });

      return {
        success: true,
        amount: bonusAmount,
        streak_days: newStreak
      };
    } catch (error) {
      logger.error('[DailyBonusService] Ошибка получения ежедневного бонуса', { userId, error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: 'Внутренняя ошибка сервера'
      };
    }
  }

  /**
   * Get user's daily bonus claim history
   */
  async getDailyBonusHistory(userId: string, limit: number = 30): Promise<any[]> {
    try {
      const { data: transactions, error } = await supabase
        .from(DAILY_BONUS_TABLES.TRANSACTIONS)
        .select('*')
        .eq('user_id', parseInt(userId))
        .eq('type', 'DAILY_BONUS')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('[DailyBonusService] Ошибка получения истории бонусов:', error.message);
        return [];
      }

      return transactions || [];
    } catch (error) {
      logger.error('[DailyBonusService] Ошибка получения истории ежедневных бонусов', { userId, error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Calculate bonus amount based on streak days
   */
  private calculateBonusAmount(streakDays: number): string {
    const baseAmount = 500; // Base 500 UNI
    const bonusMultiplier = Math.min(streakDays * 0.1, 2.0); // Max 200% bonus at 20 days
    const finalAmount = baseAmount * (1 + bonusMultiplier);
    
    return finalAmount.toFixed(6);
  }

  /**
   * Get daily bonus statistics for a user
   */
  async getDailyBonusStats(userId: string): Promise<{
    total_claimed: number;
    total_amount: string;
    current_streak: number;
    max_streak: number;
  }> {
    try {
      const { data: user, error: userError } = await supabase
        .from(DAILY_BONUS_TABLES.USERS)
        .select('checkin_streak')
        .eq('id', parseInt(userId))
        .single();

      if (userError) {
        logger.error('[DailyBonusService] Ошибка получения статистики пользователя:', userError.message);
        throw userError;
      }

      const { data: transactions, error: txError } = await supabase
        .from(DAILY_BONUS_TABLES.TRANSACTIONS)
        .select('amount_uni')
        .eq('user_id', parseInt(userId))
        .eq('type', 'DAILY_BONUS');

      if (txError) {
        logger.error('[DailyBonusService] Ошибка получения транзакций:', txError.message);
        throw txError;
      }

      const totalClaimed = transactions?.length || 0;
      const totalAmount = transactions?.reduce((sum: number, tx: any) => sum + parseFloat(tx.amount_uni || '0'), 0) || 0;

      return {
        total_claimed: totalClaimed,
        total_amount: totalAmount.toFixed(6),
        current_streak: user?.checkin_streak || 0,
        max_streak: user?.checkin_streak || 0 // TODO: Track max streak separately
      };
    } catch (error) {
      logger.error('[DailyBonusService] Ошибка получения статистики ежедневных бонусов', { userId, error: error instanceof Error ? error.message : String(error) });
      return {
        total_claimed: 0,
        total_amount: '0.000000',
        current_streak: 0,
        max_streak: 0
      };
    }
  }
}