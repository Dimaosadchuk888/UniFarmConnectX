import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger';

export interface TonFarmingData {
  user_id: number;
  farming_balance: string;
  farming_rate: string;
  farming_start_timestamp: string | null;
  farming_last_update: string | null;
  farming_accumulated: string;
  farming_last_claim: string | null;
  boost_active: boolean;
  boost_package_id: number | null;
  boost_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export class TonFarmingRepository {
  private readonly tableName = 'ton_farming_data';

  /**
   * Получить данные TON farming для пользователя
   */
  async getByUserId(userId: string): Promise<TonFarmingData | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('[TonFarmingRepository] Error getting farming data:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('[TonFarmingRepository] Exception getting farming data:', error);
      return null;
    }
  }

  /**
   * Создать или обновить данные TON farming
   */
  async upsert(data: Partial<TonFarmingData>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .upsert({
          ...data,
          updated_at: new Date().toISOString()
        });

      if (error) {
        logger.error('[TonFarmingRepository] Error upserting farming data:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[TonFarmingRepository] Exception upserting farming data:', error);
      return false;
    }
  }

  /**
   * Активировать boost пакет
   */
  async activateBoost(userId: string, packageId: number, rate: number, expiresAt?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .upsert({
          user_id: parseInt(userId),
          boost_active: true,
          boost_package_id: packageId,
          farming_rate: rate.toString(),
          boost_expires_at: expiresAt || null,
          farming_start_timestamp: new Date().toISOString(),
          farming_last_update: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        logger.error('[TonFarmingRepository] Error activating boost:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[TonFarmingRepository] Exception activating boost:', error);
      return false;
    }
  }

  /**
   * Деактивировать boost
   */
  async deactivateBoost(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .update({
          boost_active: false,
          boost_package_id: null,
          boost_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        logger.error('[TonFarmingRepository] Error deactivating boost:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[TonFarmingRepository] Exception deactivating boost:', error);
      return false;
    }
  }

  /**
   * Обновить накопленный доход
   */
  async updateAccumulated(userId: string, accumulated: string, lastUpdate: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .update({
          farming_accumulated: accumulated,
          farming_last_update: lastUpdate,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        logger.error('[TonFarmingRepository] Error updating accumulated:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[TonFarmingRepository] Exception updating accumulated:', error);
      return false;
    }
  }

  /**
   * Получить всех активных boost пользователей
   */
  async getActiveBoostUsers(): Promise<TonFarmingData[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('boost_active', true);

      if (error) {
        logger.error('[TonFarmingRepository] Error getting active boost users:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('[TonFarmingRepository] Exception getting active boost users:', error);
      return [];
    }
  }

  /**
   * Забрать накопленный доход
   */
  async claimAccumulated(userId: string): Promise<string> {
    try {
      const data = await this.getByUserId(userId);
      if (!data) return '0';

      const accumulated = data.farming_accumulated || '0';

      const { error } = await supabase
        .from(this.tableName)
        .update({
          farming_accumulated: '0',
          farming_last_claim: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        logger.error('[TonFarmingRepository] Error claiming accumulated:', error);
        return '0';
      }

      return accumulated;
    } catch (error) {
      logger.error('[TonFarmingRepository] Exception claiming accumulated:', error);
      return '0';
    }
  }
}

export const tonFarmingRepository = new TonFarmingRepository();