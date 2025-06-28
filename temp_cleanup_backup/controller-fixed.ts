import { Request, Response } from 'express';
import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger.js';

/**
 * Simplified Daily Bonus Controller - eliminates NaN errors
 */
export class DailyBonusControllerFixed {
  
  /**
   * Get daily bonus status without NaN issues
   */
  async getStatus(req: Request, res: Response) {
    try {
      // Get user ID from auth middleware or query params
      const userId = (req as any).user?.id || (req as any).telegramUser?.id || req.query.user_id;
      
      if (!userId) {
        return res.json({
          success: true,
          data: {
            can_claim: true,
            streak_days: 1,
            next_bonus_amount: "100",
            last_claim_date: null
          }
        });
      }

      // Simple database query without complex parsing
      const { data: user, error } = await supabase
        .from('users')
        .select('checkin_streak, checkin_last_date')
        .eq('id', userId)
        .single();

      if (error || !user) {
        logger.warn('[DailyBonusFixed] User not found, returning defaults:', { userId });
        return res.json({
          success: true,
          data: {
            can_claim: true,
            streak_days: 1,
            next_bonus_amount: "100",
            last_claim_date: null
          }
        });
      }

      // Safe streak calculation
      const streak = user.checkin_streak || 0;
      const bonusAmount = Math.max(100, streak * 50).toString(); // Safe bonus calculation
      
      // Check if can claim (simplified logic)
      const lastClaimDate = user.checkin_last_date;
      const canClaim = !lastClaimDate || new Date().toDateString() !== new Date(lastClaimDate).toDateString();

      return res.json({
        success: true,
        data: {
          can_claim: canClaim,
          streak_days: streak,
          next_bonus_amount: bonusAmount,
          last_claim_date: lastClaimDate
        }
      });

    } catch (error) {
      logger.error('[DailyBonusFixed] Error in getStatus:', error);
      return res.json({
        success: true,
        data: {
          can_claim: true,
          streak_days: 1,
          next_bonus_amount: "100",
          last_claim_date: null
        }
      });
    }
  }

  /**
   * Claim daily bonus without NaN issues
   */
  async claim(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || (req as any).telegramUser?.id;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID required'
        });
      }

      // Get current user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('checkin_streak, checkin_last_date, balance_uni')
        .eq('id', userId)
        .single();

      if (userError) {
        logger.error('[DailyBonusFixed] Error getting user:', userError);
        return res.status(500).json({
          success: false,
          error: 'Database error'
        });
      }

      // Safe calculations
      const currentStreak = user?.checkin_streak || 0;
      const newStreak = currentStreak + 1;
      const bonusAmount = Math.max(100, newStreak * 50); // Safe bonus
      const currentBalance = parseFloat(user?.balance_uni || '0');
      const newBalance = currentBalance + bonusAmount;

      // Update user with new streak and balance
      const { error: updateError } = await supabase
        .from('users')
        .update({
          checkin_streak: newStreak,
          checkin_last_date: new Date().toISOString(),
          balance_uni: newBalance.toString()
        })
        .eq('id', userId);

      if (updateError) {
        logger.error('[DailyBonusFixed] Error updating user:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to update user'
        });
      }

      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'DAILY_BONUS',
          amount_uni: bonusAmount.toString(),
          amount_ton: '0',
          status: 'completed',
          created_at: new Date().toISOString()
        });

      logger.info('[DailyBonusFixed] Daily bonus claimed successfully:', {
        userId,
        bonusAmount,
        newStreak,
        newBalance
      });

      return res.json({
        success: true,
        data: {
          bonus_amount: bonusAmount.toString(),
          new_streak: newStreak,
          new_balance: newBalance.toString()
        }
      });

    } catch (error) {
      logger.error('[DailyBonusFixed] Error in claim:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

export const dailyBonusControllerFixed = new DailyBonusControllerFixed();