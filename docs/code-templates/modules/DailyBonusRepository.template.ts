/**
 * Repository для модуля Daily Bonus
 * Управление ежедневными бонусами и стриками
 */

import { BaseRepository } from '../BaseRepository';
import { supabase } from '../../core/supabase';
import { DailyBonusLog, InsertDailyBonusLog, User } from '../../shared/schema';
import { logger } from '../../utils/logger';
import { subDays, startOfDay, differenceInDays } from 'date-fns';

export class DailyBonusRepository extends BaseRepository<DailyBonusLog> {
  constructor() {
    super('daily_bonus_logs');
  }

  /**
   * Проверить, получал ли пользователь бонус сегодня
   */
  async hasClaimedToday(userId: number): Promise<boolean> {
    try {
      const today = startOfDay(new Date());
      const { data, error } = await supabase
        .from('daily_bonus_logs')
        .select('id')
        .eq('user_id', userId)
        .gte('claimed_at', today.toISOString())
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      logger.error('Error checking daily bonus claim:', error);
      throw error;
    }
  }

  /**
   * Получить текущий стрик пользователя
   */
  async getUserStreak(userId: number): Promise<number> {
    try {
      // Получаем последнюю запись о бонусе
      const { data: lastClaim, error } = await supabase
        .from('daily_bonus_logs')
        .select('claimed_at, streak_day')
        .eq('user_id', userId)
        .order('claimed_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return 0; // Нет записей
        throw error;
      }

      if (!lastClaim) return 0;

      // Проверяем, прерван ли стрик
      const lastClaimDate = new Date(lastClaim.claimed_at);
      const today = new Date();
      const daysDiff = differenceInDays(startOfDay(today), startOfDay(lastClaimDate));

      // Если прошло больше 1 дня - стрик прерван
      if (daysDiff > 1) return 0;
      
      // Если сегодня уже получал - возвращаем текущий стрик
      if (daysDiff === 0) return lastClaim.streak_day;
      
      // Если вчера получал - стрик продолжается
      return lastClaim.streak_day;
    } catch (error) {
      logger.error('Error getting user streak:', error);
      throw error;
    }
  }

  /**
   * Начислить ежедневный бонус
   */
  async claimDailyBonus(userId: number): Promise<{
    success: boolean;
    bonusAmount: number;
    streakDay: number;
    message: string;
  }> {
    try {
      // Проверяем, не получал ли уже сегодня
      const hasClaimed = await this.hasClaimedToday(userId);
      if (hasClaimed) {
        return {
          success: false,
          bonusAmount: 0,
          streakDay: 0,
          message: 'Daily bonus already claimed today'
        };
      }

      // Получаем текущий стрик
      const currentStreak = await this.getUserStreak(userId);
      const newStreakDay = currentStreak + 1;

      // Рассчитываем размер бонуса (базовый 10 UNI + бонус за стрик)
      const baseBonus = 10;
      const streakBonus = Math.min(newStreakDay - 1, 30) * 5; // Макс 150 UNI бонуса за 30 дней
      const totalBonus = baseBonus + streakBonus;

      // Создаем запись о получении бонуса
      const { data, error } = await supabase
        .from('daily_bonus_logs')
        .insert({
          user_id: userId,
          bonus_amount: totalBonus.toString(),
          streak_day: newStreakDay,
          currency: 'UNI',
          bonus_type: 'daily_checkin'
        })
        .select()
        .single();

      if (error) throw error;

      // TODO: Начислить бонус через TransactionService
      // await transactionService.createDailyBonus(userId, totalBonus);

      // Обновляем данные стрика в таблице users
      await supabase
        .from('users')
        .update({
          checkin_streak: newStreakDay,
          checkin_last_date: new Date().toISOString()
        })
        .eq('id', userId);

      return {
        success: true,
        bonusAmount: totalBonus,
        streakDay: newStreakDay,
        message: `Daily bonus claimed! ${totalBonus} UNI received (Day ${newStreakDay})`
      };
    } catch (error) {
      logger.error('Error claiming daily bonus:', error);
      throw error;
    }
  }

  /**
   * Получить историю бонусов пользователя
   */
  async getBonusHistory(
    userId: number, 
    limit: number = 30
  ): Promise<DailyBonusLog[]> {
    try {
      const { data, error } = await supabase
        .from('daily_bonus_logs')
        .select('*')
        .eq('user_id', userId)
        .order('claimed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching bonus history:', error);
      throw error;
    }
  }

  /**
   * Получить статистику бонусов пользователя
   */
  async getBonusStats(userId: number): Promise<{
    totalClaimed: number;
    totalAmount: number;
    currentStreak: number;
    maxStreak: number;
    lastClaimDate: Date | null;
  }> {
    try {
      const [history, currentStreak] = await Promise.all([
        this.getBonusHistory(userId, 1000),
        this.getUserStreak(userId)
      ]);

      const totalAmount = history.reduce(
        (sum, log) => sum + parseFloat(log.bonus_amount || '0'), 
        0
      );

      const maxStreak = Math.max(
        ...history.map(log => log.streak_day),
        0
      );

      const lastClaimDate = history.length > 0 
        ? new Date(history[0].claimed_at!) 
        : null;

      return {
        totalClaimed: history.length,
        totalAmount,
        currentStreak,
        maxStreak,
        lastClaimDate
      };
    } catch (error) {
      logger.error('Error fetching bonus stats:', error);
      throw error;
    }
  }

  /**
   * Сбросить стрик пользователя (админ функция)
   */
  async resetStreak(userId: number): Promise<void> {
    try {
      await supabase
        .from('users')
        .update({
          checkin_streak: 0,
          checkin_last_date: null
        })
        .eq('id', userId);
    } catch (error) {
      logger.error('Error resetting user streak:', error);
      throw error;
    }
  }

  /**
   * Получить топ пользователей по стрикам
   */
  async getTopStreaks(limit: number = 10): Promise<{
    user_id: number;
    username: string;
    streak: number;
  }[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, checkin_streak')
        .gt('checkin_streak', 0)
        .order('checkin_streak', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(user => ({
        user_id: user.id,
        username: user.username || 'Anonymous',
        streak: user.checkin_streak || 0
      }));
    } catch (error) {
      logger.error('Error fetching top streaks:', error);
      throw error;
    }
  }
}

export const dailyBonusRepository = new DailyBonusRepository();