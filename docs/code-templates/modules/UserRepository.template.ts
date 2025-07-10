/**
 * Repository для модуля User
 * Управление пользователями и их профилями
 */

import { BaseRepository } from '../BaseRepository';
import { supabase } from '../../core/supabase';
import { User, InsertUser } from '../../shared/schema';
import { logger } from '../../utils/logger';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  /**
   * Найти пользователя по Telegram ID
   */
  async findByTelegramId(telegramId: number): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error finding user by telegram ID:', error);
      throw error;
    }
  }

  /**
   * Найти пользователя по реферальному коду
   */
  async findByRefCode(refCode: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('ref_code', refCode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error finding user by ref code:', error);
      throw error;
    }
  }

  /**
   * Создать нового пользователя
   */
  async createUser(userData: InsertUser): Promise<User> {
    try {
      // Генерируем уникальный реферальный код
      const refCode = userData.ref_code || this.generateRefCode();

      const { data, error } = await supabase
        .from('users')
        .insert({
          ...userData,
          ref_code: refCode,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Обновить баланс пользователя
   */
  async updateBalance(
    userId: number,
    updates: {
      balance_uni?: string;
      balance_ton?: string;
    }
  ): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating user balance:', error);
      throw error;
    }
  }

  /**
   * Добавить к балансу
   */
  async addToBalance(
    userId: number,
    amount: number,
    currency: 'UNI' | 'TON'
  ): Promise<User | null> {
    try {
      // Получаем текущий баланс
      const user = await this.getById(userId);
      if (!user) throw new Error('User not found');

      const field = currency === 'UNI' ? 'balance_uni' : 'balance_ton';
      const currentBalance = parseFloat(user[field] || '0');
      const newBalance = (currentBalance + amount).toFixed(6);

      return await this.updateBalance(userId, {
        [field]: newBalance
      });
    } catch (error) {
      logger.error('Error adding to balance:', error);
      throw error;
    }
  }

  /**
   * Вычесть из баланса
   */
  async subtractFromBalance(
    userId: number,
    amount: number,
    currency: 'UNI' | 'TON'
  ): Promise<User | null> {
    try {
      // Получаем текущий баланс
      const user = await this.getById(userId);
      if (!user) throw new Error('User not found');

      const field = currency === 'UNI' ? 'balance_uni' : 'balance_ton';
      const currentBalance = parseFloat(user[field] || '0');

      if (currentBalance < amount) {
        throw new Error(`Insufficient ${currency} balance`);
      }

      const newBalance = (currentBalance - amount).toFixed(6);

      return await this.updateBalance(userId, {
        [field]: newBalance
      });
    } catch (error) {
      logger.error('Error subtracting from balance:', error);
      throw error;
    }
  }

  /**
   * Обновить TON кошелек пользователя
   */
  async updateTonWallet(
    userId: number,
    walletAddress: string
  ): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ton_wallet_address: walletAddress,
          ton_wallet_verified: true,
          ton_wallet_linked_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating TON wallet:', error);
      throw error;
    }
  }

  /**
   * Получить рефералов пользователя
   */
  async getUserReferrals(userId: number): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('referred_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching user referrals:', error);
      throw error;
    }
  }

  /**
   * Получить статистику пользователя
   */
  async getUserStats(userId: number): Promise<{
    totalReferrals: number;
    activeReferrals: number;
    totalEarnedUni: number;
    totalEarnedTon: number;
    farmingActive: boolean;
    boostActive: boolean;
  }> {
    try {
      const user = await this.getById(userId);
      if (!user) throw new Error('User not found');

      // Получаем рефералов
      const referrals = await this.getUserReferrals(userId);
      const activeReferrals = referrals.filter(
        ref => ref.uni_farming_active || ref.ton_boost_active
      ).length;

      // Получаем заработок из транзакций
      const { data: rewards } = await supabase
        .from('transactions')
        .select('currency, amount')
        .eq('user_id', userId)
        .in('transaction_type', [
          'FARMING_REWARD',
          'BOOST_REWARD',
          'REFERRAL_REWARD',
          'MISSION_REWARD',
          'DAILY_BONUS'
        ]);

      let totalEarnedUni = 0;
      let totalEarnedTon = 0;

      rewards?.forEach(reward => {
        const amount = parseFloat(reward.amount || '0');
        if (reward.currency === 'UNI') {
          totalEarnedUni += amount;
        } else if (reward.currency === 'TON') {
          totalEarnedTon += amount;
        }
      });

      return {
        totalReferrals: referrals.length,
        activeReferrals,
        totalEarnedUni,
        totalEarnedTon,
        farmingActive: user.uni_farming_active || false,
        boostActive: user.ton_boost_active || false
      };
    } catch (error) {
      logger.error('Error fetching user stats:', error);
      throw error;
    }
  }

  /**
   * Поиск пользователей
   */
  async searchUsers(
    query: string,
    limit: number = 20
  ): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`username.ilike.%${query}%,ref_code.ilike.%${query}%`)
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Получить топ пользователей по балансу
   */
  async getTopUsers(
    currency: 'UNI' | 'TON',
    limit: number = 10
  ): Promise<User[]> {
    try {
      const field = currency === 'UNI' ? 'balance_uni' : 'balance_ton';
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order(field, { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching top users:', error);
      throw error;
    }
  }

  /**
   * Генерация уникального реферального кода
   */
  private generateRefCode(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `REF_${timestamp}_${random}`;
  }

  /**
   * Обновить админ статус (админ функция)
   */
  async setAdminStatus(
    userId: number,
    isAdmin: boolean
  ): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ is_admin: isAdmin })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating admin status:', error);
      throw error;
    }
  }
}

export const userRepository = new UserRepository();