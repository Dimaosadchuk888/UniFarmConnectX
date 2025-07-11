import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger';

export interface UniFarmingData {
  user_id: number;
  deposit_amount: string;
  farming_balance: string;
  farming_rate: string;
  farming_start_timestamp: string | null;
  farming_last_update: string | null;
  farming_deposit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class UniFarmingRepository {
  private readonly tableName = 'uni_farming_data';

  /**
   * Получить данные UNI farming для пользователя
   */
  async getByUserId(userId: string): Promise<UniFarmingData | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('[UniFarmingRepository] Error getting farming data:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('[UniFarmingRepository] Exception getting farming data:', error);
      return null;
    }
  }

  /**
   * Создать или обновить данные UNI farming
   */
  async upsert(data: Partial<UniFarmingData>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .upsert({
          ...data,
          updated_at: new Date().toISOString()
        });

      if (error) {
        logger.error('[UniFarmingRepository] Error upserting farming data:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[UniFarmingRepository] Exception upserting farming data:', error);
      return false;
    }
  }

  /**
   * Обновить активность farming
   */
  async updateActivity(userId: string, isActive: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        logger.error('[UniFarmingRepository] Error updating activity:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[UniFarmingRepository] Exception updating activity:', error);
      return false;
    }
  }

  /**
   * Обновить баланс farming
   */
  async updateBalance(userId: string, balance: string, lastUpdate: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .update({
          farming_balance: balance,
          farming_last_update: lastUpdate,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        logger.error('[UniFarmingRepository] Error updating balance:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[UniFarmingRepository] Exception updating balance:', error);
      return false;
    }
  }

  /**
   * Получить всех активных фармеров
   */
  async getActiveFarmers(): Promise<UniFarmingData[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('is_active', true);

      if (error) {
        logger.error('[UniFarmingRepository] Error getting active farmers:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('[UniFarmingRepository] Exception getting active farmers:', error);
      return [];
    }
  }

  /**
   * Добавить депозит
   */
  async addDeposit(userId: string, amount: string): Promise<boolean> {
    try {
      const existing = await this.getByUserId(userId);
      const currentDeposit = existing ? parseFloat(existing.deposit_amount) : 0;
      const newDeposit = (currentDeposit + parseFloat(amount)).toString();

      const { error } = await supabase
        .from(this.tableName)
        .upsert({
          user_id: parseInt(userId),
          deposit_amount: newDeposit,
          farming_deposit: newDeposit,
          is_active: true,
          farming_start_timestamp: new Date().toISOString(),
          farming_last_update: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        logger.error('[UniFarmingRepository] Error adding deposit:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[UniFarmingRepository] Exception adding deposit:', error);
      return false;
    }
  }
}

export const uniFarmingRepository = new UniFarmingRepository();