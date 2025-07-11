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
  private useFallback: boolean = false;
  
  constructor() {
    // Проверяем существование таблицы при инициализации
    this.checkTableExists();
  }
  
  private async checkTableExists(): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .select('user_id')
        .limit(1);
        
      if (error?.code === '42P01') {
        this.useFallback = true;
        logger.info('[TonFarmingRepository] Using fallback mode - table does not exist');
      } else {
        this.useFallback = false;
        logger.info('[TonFarmingRepository] Table exists, using direct mode');
      }
    } catch (error) {
      this.useFallback = true;
      logger.warn('[TonFarmingRepository] Error checking table, using fallback:', error);
    }
  }

  /**
   * Получить данные TON farming для пользователя
   */
  async getByUserId(userId: string): Promise<TonFarmingData | null> {
    try {
      // Если используем fallback, сразу идем в users
      if (this.useFallback) {
        return this.getByUserIdFallback(userId);
      }
      
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === '42P01') {
          // Таблица не существует, используем fallback
          this.useFallback = true;
          return this.getByUserIdFallback(userId);
        }
        
        if (error.code === 'PGRST116') {
          // Нет данных - создаем запись
          const newData: Partial<TonFarmingData> = {
            user_id: parseInt(userId),
            farming_balance: '0',
            farming_rate: '0.01',
            farming_accumulated: '0',
            boost_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          await this.upsert(newData);
          return this.getByUserId(userId);
        }
        
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
   * Fallback метод для получения данных из таблицы users
   */
  private async getByUserIdFallback(userId: string): Promise<TonFarmingData | null> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return null;
      }

      // Преобразуем данные из users в формат TonFarmingData
      return {
        user_id: parseInt(userId),
        farming_balance: user.ton_farming_balance || '0',
        farming_rate: user.ton_farming_rate || '0.01',
        farming_start_timestamp: user.ton_farming_start_timestamp,
        farming_last_update: user.ton_farming_last_update,
        farming_accumulated: user.ton_farming_accumulated || '0',
        farming_last_claim: user.ton_farming_last_claim,
        boost_active: user.ton_boost_active || false,
        boost_package_id: user.ton_boost_package_id,
        boost_expires_at: user.ton_boost_expires_at,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at
      };
    } catch (error) {
      logger.error('[TonFarmingRepository] Exception in fallback:', error);
      return null;
    }
  }

  /**
   * Создать или обновить данные TON farming
   */
  async upsert(data: Partial<TonFarmingData>): Promise<boolean> {
    try {
      if (this.useFallback) {
        return this.upsertFallback(data);
      }
      
      const { error } = await supabase
        .from(this.tableName)
        .upsert({
          ...data,
          updated_at: new Date().toISOString()
        });

      if (error) {
        if (error.code === '42P01') {
          // Таблица не существует, используем fallback
          this.useFallback = true;
          return this.upsertFallback(data);
        }
        logger.error('[TonFarmingRepository] Error upserting farming data:', error);
        return false;
      }

      // Синхронизируем с таблицей users
      await this.syncToUsers(data);
      
      return true;
    } catch (error) {
      logger.error('[TonFarmingRepository] Exception upserting farming data:', error);
      return false;
    }
  }
  
  /**
   * Синхронизирует данные из ton_farming_data в users
   */
  private async syncToUsers(data: Partial<TonFarmingData>): Promise<void> {
    if (!data.user_id) return;
    
    try {
      const updates: any = {};
      
      if (data.farming_balance !== undefined) updates.ton_farming_balance = data.farming_balance;
      if (data.farming_rate !== undefined) updates.ton_farming_rate = data.farming_rate;
      if (data.farming_start_timestamp !== undefined) updates.ton_farming_start_timestamp = data.farming_start_timestamp;
      if (data.farming_last_update !== undefined) updates.ton_farming_last_update = data.farming_last_update;
      if (data.farming_accumulated !== undefined) updates.ton_farming_accumulated = data.farming_accumulated;
      if (data.farming_last_claim !== undefined) updates.ton_farming_last_claim = data.farming_last_claim;
      if (data.boost_active !== undefined) updates.ton_boost_active = data.boost_active;
      if (data.boost_package_id !== undefined) updates.ton_boost_package_id = data.boost_package_id;
      if (data.boost_expires_at !== undefined) updates.ton_boost_expires_at = data.boost_expires_at;
      
      if (Object.keys(updates).length === 0) return;
      
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', data.user_id);
        
      if (error) {
        logger.warn('[TonFarmingRepository] Failed to sync to users:', error);
      } else {
        logger.info('[TonFarmingRepository] Synced to users table');
      }
    } catch (error) {
      logger.warn('[TonFarmingRepository] Exception syncing to users:', error);
    }
  }
  
  /**
   * Fallback метод для обновления данных в таблице users
   */
  private async upsertFallback(data: Partial<TonFarmingData>): Promise<boolean> {
    try {
      const updates: any = {};
      
      if (data.farming_balance !== undefined) updates.ton_farming_balance = data.farming_balance;
      if (data.farming_rate !== undefined) updates.ton_farming_rate = data.farming_rate;
      if (data.farming_start_timestamp !== undefined) updates.ton_farming_start_timestamp = data.farming_start_timestamp;
      if (data.farming_last_update !== undefined) updates.ton_farming_last_update = data.farming_last_update;
      if (data.farming_accumulated !== undefined) updates.ton_farming_accumulated = data.farming_accumulated;
      if (data.farming_last_claim !== undefined) updates.ton_farming_last_claim = data.farming_last_claim;
      if (data.boost_active !== undefined) updates.ton_boost_active = data.boost_active;
      if (data.boost_package_id !== undefined) updates.ton_boost_package_id = data.boost_package_id;
      if (data.boost_expires_at !== undefined) updates.ton_boost_expires_at = data.boost_expires_at;
      
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', data.user_id);

      if (error) {
        logger.error('[TonFarmingRepository] Error updating users table:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[TonFarmingRepository] Exception in fallback upsert:', error);
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
        if (error.code === '42P01') {
          // Таблица не существует, используем fallback
          this.useFallback = true;
          const { error: fallbackError } = await supabase
            .from('users')
            .update({
              ton_boost_active: true,
              ton_boost_package_id: packageId,
              ton_farming_rate: rate.toString(),
              ton_boost_expires_at: expiresAt || null,
              ton_farming_start_timestamp: new Date().toISOString(),
              ton_farming_last_update: new Date().toISOString()
            })
            .eq('id', userId);
          
          if (fallbackError) {
            logger.error('[TonFarmingRepository] Error activating boost in users table:', fallbackError);
            return false;
          }
          return true;
        }
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
        if (error.code === '42P01') {
          // Таблица не существует, используем fallback
          this.useFallback = true;
          const { error: fallbackError } = await supabase
            .from('users')
            .update({
              ton_boost_active: false,
              ton_boost_package_id: null,
              ton_boost_expires_at: null
            })
            .eq('id', userId);
          
          if (fallbackError) {
            logger.error('[TonFarmingRepository] Error deactivating boost in users table:', fallbackError);
            return false;
          }
          return true;
        }
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
        if (error.code === '42P01') {
          // Таблица не существует, используем fallback
          this.useFallback = true;
          const { error: fallbackError } = await supabase
            .from('users')
            .update({
              ton_farming_accumulated: accumulated,
              ton_farming_last_update: lastUpdate
            })
            .eq('id', userId);
          
          if (fallbackError) {
            logger.error('[TonFarmingRepository] Error updating accumulated in users table:', fallbackError);
            return false;
          }
          return true;
        }
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
        if (error.code === '42P01') {
          // Таблица не существует, используем fallback
          this.useFallback = true;
          return this.getActiveBoostUsersFallback();
        }
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
   * Fallback метод для получения активных boost пользователей из таблицы users
   */
  private async getActiveBoostUsersFallback(): Promise<TonFarmingData[]> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('ton_boost_active', true);

      if (error || !users) {
        return [];
      }

      // Преобразуем данные из users в формат TonFarmingData
      return users.map(user => ({
        user_id: user.id,
        farming_balance: user.ton_farming_balance || '0',
        farming_rate: user.ton_farming_rate || '0.01',
        farming_start_timestamp: user.ton_farming_start_timestamp,
        farming_last_update: user.ton_farming_last_update,
        farming_accumulated: user.ton_farming_accumulated || '0',
        farming_last_claim: user.ton_farming_last_claim,
        boost_active: user.ton_boost_active || false,
        boost_package_id: user.ton_boost_package_id,
        boost_expires_at: user.ton_boost_expires_at,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at
      }));
    } catch (error) {
      logger.error('[TonFarmingRepository] Exception in fallback getActiveBoostUsers:', error);
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