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
      
      // Получаем текущий баланс перед обновлением
      const currentBalance = user.balance_uni || 0;
      
      // Update balance through centralized BalanceManager
      const { balanceManager } = await import('../../core/BalanceManager');
      const result = await balanceManager.addBalance(
        userIdNumber,
        Math.floor(parseFloat(bonusAmount)), // Гарантия целых чисел
        0,
        'DailyBonusService.claim'
      );

      if (!result.success) {
        logger.error('[DailyBonusService] Ошибка обновления баланса:', result.error);
        return { success: false, error: result.error || 'Ошибка начисления бонуса' };
      }
      
      // Вычисляем новый баланс
      const newBalance = currentBalance + Math.floor(parseFloat(bonusAmount));

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

      // 🛡️ КРИТИЧЕСКАЯ ЗАЩИТА: Проверка дубликатов перед созданием DAILY_BONUS
      const { DeduplicationHelper } = await import('../../safe-deduplication-helper');
      const duplicateCheck = await DeduplicationHelper.checkRecentTransaction(
        userIdNumber,
        'DAILY_BONUS',
        Math.floor(parseFloat(bonusAmount)),
        'UNI',
        60 // 60 минут окно для ежедневных бонусов
      );

      if (duplicateCheck.exists) {
        DeduplicationHelper.logPreventedDuplicate(
          userIdNumber,
          'DAILY_BONUS',
          Math.floor(parseFloat(bonusAmount)),
          `Daily bonus streak ${newStreak} (prevented duplicate)`
        );
        
        logger.warn('[DailyBonusService] 🛡️ ДУБЛИРОВАНИЕ ПРЕДОТВРАЩЕНО: Daily bonus уже существует', {
          userId: userIdNumber,
          streak: newStreak,
          bonusAmount: Math.floor(parseFloat(bonusAmount)),
          existingTransactionId: duplicateCheck.existingTransaction?.id
        });
        
        // Возвращаем успех, так как бонус уже был начислен
        return {
          success: true,
          amount: bonusAmount,
          streak_days: newStreak
        };
      }

      // Создаем транзакцию через UnifiedTransactionService
      const { UnifiedTransactionService } = await import('../../core/TransactionService');
      const transactionService = UnifiedTransactionService.getInstance();
      
      try {
        await transactionService.createTransaction({
          user_id: userIdNumber,
          type: 'DAILY_BONUS',  // Исправлен тип согласно ExtendedTransactionType
          amount_uni: Math.floor(parseFloat(bonusAmount)), // Целые числа
          amount_ton: 0,
          currency: 'UNI',
          status: 'completed',
          description: `Daily bonus day ${newStreak}`,
          metadata: {
            streak: newStreak,
            bonus_amount: Math.floor(parseFloat(bonusAmount)), // Целые числа
            original_type: 'DAILY_BONUS'
          }
        });
      } catch (txError) {
        logger.warn('[DailyBonusService] Ошибка создания транзакции:', txError);
      }

      // Записываем в daily_bonus_logs (правильное название таблицы)
      const { error: logError } = await supabase
        .from('daily_bonus_logs')
        .insert({
          user_id: userIdNumber,
          amount: Math.floor(parseFloat(bonusAmount)), // Целые числа
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
        .eq('type', 'DAILY_BONUS')  // Исправлен тип согласно ExtendedTransactionType
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
   * КАЛИБРОВКА: Возвращаем точно ту сумму, что показана на карточке (без streak бонуса)
   */
  private calculateBonusAmount(streakDays: number): string {
    const baseAmount = 600; // Фиксированная сумма как на карточке
    // ОТКЛЮЧЕН streak multiplier - начисляем точно сколько показано
    // const bonusMultiplier = Math.min(streakDays * 0.1, 2.0);
    // const finalAmount = baseAmount * (1 + bonusMultiplier);
    
    const finalAmount = baseAmount; // Точно 600 UNI как обещано
    
    return Math.floor(finalAmount).toString(); // Целые числа без дробей
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
        .eq('type', 'DAILY_BONUS');  // Исправлен тип согласно ExtendedTransactionType

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