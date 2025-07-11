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
  private useFallback: boolean = false;

  /**
   * Получить данные UNI farming для пользователя
   */
  async getByUserId(userId: string): Promise<UniFarmingData | null> {
    try {
      // Попробуем получить из новой таблицы
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
        
        if (error.code !== 'PGRST116') {
          logger.error('[UniFarmingRepository] Error getting farming data:', error);
        }
        return null;
      }

      return data;
    } catch (error) {
      logger.error('[UniFarmingRepository] Exception getting farming data:', error);
      return null;
    }
  }
  
  /**
   * Fallback метод для получения данных из таблицы users
   */
  private async getByUserIdFallback(userId: string): Promise<UniFarmingData | null> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return null;
      }

      // Преобразуем данные из users в формат UniFarmingData
      return {
        user_id: parseInt(userId),
        deposit_amount: user.uni_deposit_amount || '0',
        farming_balance: user.uni_farming_balance || '0',
        farming_rate: user.uni_farming_rate || '0.01',
        farming_start_timestamp: user.uni_farming_start_timestamp,
        farming_last_update: user.uni_farming_last_update,
        farming_deposit: user.uni_farming_deposit || '0',
        is_active: user.uni_farming_active || false,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at
      };
    } catch (error) {
      logger.error('[UniFarmingRepository] Exception in fallback:', error);
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
        if (error.code === '42P01') {
          // Таблица не существует, используем fallback
          this.useFallback = true;
          return this.upsertFallback(data);
        }
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
   * Fallback метод для обновления данных в таблице users
   */
  private async upsertFallback(data: Partial<UniFarmingData>): Promise<boolean> {
    try {
      const updates: any = {};
      
      if (data.deposit_amount !== undefined) updates.uni_deposit_amount = data.deposit_amount;
      if (data.farming_balance !== undefined) updates.uni_farming_balance = data.farming_balance;
      if (data.farming_rate !== undefined) updates.uni_farming_rate = data.farming_rate;
      if (data.farming_start_timestamp !== undefined) updates.uni_farming_start_timestamp = data.farming_start_timestamp;
      if (data.farming_last_update !== undefined) updates.uni_farming_last_update = data.farming_last_update;
      if (data.farming_deposit !== undefined) updates.uni_farming_deposit = data.farming_deposit;
      if (data.is_active !== undefined) updates.uni_farming_active = data.is_active;
      
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', data.user_id);

      if (error) {
        logger.error('[UniFarmingRepository] Error updating users table:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[UniFarmingRepository] Exception in fallback upsert:', error);
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
        if (error.code === '42P01') {
          // Таблица не существует, используем fallback
          this.useFallback = true;
          const { error: fallbackError } = await supabase
            .from('users')
            .update({ uni_farming_active: isActive })
            .eq('id', userId);
          
          if (fallbackError) {
            logger.error('[UniFarmingRepository] Error updating activity in users table:', fallbackError);
            return false;
          }
          return true;
        }
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
        if (error.code === '42P01') {
          // Таблица не существует, используем fallback
          this.useFallback = true;
          const { error: fallbackError } = await supabase
            .from('users')
            .update({ 
              uni_farming_balance: balance,
              uni_farming_last_update: lastUpdate
            })
            .eq('id', userId);
          
          if (fallbackError) {
            logger.error('[UniFarmingRepository] Error updating balance in users table:', fallbackError);
            return false;
          }
          return true;
        }
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
        if (error.code === '42P01') {
          // Таблица не существует, используем fallback
          this.useFallback = true;
          return this.getActiveFarmersFallback();
        }
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
   * Fallback метод для получения активных фармеров из таблицы users
   */
  private async getActiveFarmersFallback(): Promise<UniFarmingData[]> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('uni_farming_active', true);

      if (error || !users) {
        return [];
      }

      // Преобразуем данные из users в формат UniFarmingData
      return users.map(user => ({
        user_id: user.id,
        deposit_amount: user.uni_deposit_amount || '0',
        farming_balance: user.uni_farming_balance || '0',
        farming_rate: user.uni_farming_rate || '0.01',
        farming_start_timestamp: user.uni_farming_start_timestamp,
        farming_last_update: user.uni_farming_last_update,
        farming_deposit: user.uni_farming_deposit || '0',
        is_active: user.uni_farming_active || false,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at
      }));
    } catch (error) {
      logger.error('[UniFarmingRepository] Exception in fallback getActiveFarmers:', error);
      return [];
    }
  }

  /**
   * Добавить депозит
   */
  async addDeposit(userId: string, amount: string): Promise<boolean> {
    try {
      logger.info('[UniFarmingRepository] addDeposit вызван', { userId, amount });
      
      const existing = await this.getByUserId(userId);
      const currentDeposit = existing ? parseFloat(existing.deposit_amount) : 0;
      const newDeposit = (currentDeposit + parseFloat(amount)).toString();
      
      logger.info('[UniFarmingRepository] Текущий депозит', { 
        currentDeposit, 
        newDeposit,
        existing: !!existing 
      });

      // Проверяем, существует ли запись
      const { data: existingData, error: checkError } = await supabase
        .from(this.tableName)
        .select('user_id')
        .eq('user_id', parseInt(userId))
        .single();
      
      let error;
      
      if (existingData) {
        // Запись существует - используем UPDATE
        logger.info('[UniFarmingRepository] Запись существует, используем UPDATE');
        const { error: updateError } = await supabase
          .from(this.tableName)
          .update({
            deposit_amount: newDeposit,
            farming_deposit: newDeposit,
            is_active: true,
            farming_last_update: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', parseInt(userId));
        error = updateError;
        
        // Синхронизируем с таблицей users
        if (!error) {
          logger.info('[UniFarmingRepository] Синхронизируем с таблицей users');
          const { error: syncError } = await supabase
            .from('users')
            .update({
              uni_deposit_amount: newDeposit,
              uni_farming_deposit: newDeposit,
              uni_farming_active: true,
              uni_farming_last_update: new Date().toISOString()
            })
            .eq('id', userId);
          
          if (syncError) {
            logger.error('[UniFarmingRepository] Ошибка синхронизации с users:', syncError);
          }
        }
      } else {
        // Записи нет - используем INSERT
        logger.info('[UniFarmingRepository] Записи нет, используем INSERT');
        const { error: insertError } = await supabase
          .from(this.tableName)
          .insert({
            user_id: parseInt(userId),
            deposit_amount: newDeposit,
            farming_deposit: newDeposit,
            is_active: true,
            farming_start_timestamp: new Date().toISOString(),
            farming_last_update: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        error = insertError;
      }

      if (error) {
        logger.warn('[UniFarmingRepository] Ошибка при upsert в uni_farming_data', {
          code: error.code,
          message: error.message,
          details: error.details
        });
        
        if (error.code === '42P01') {
          // Таблица не существует, используем fallback
          logger.info('[UniFarmingRepository] Таблица uni_farming_data не существует, используем fallback на users');
          this.useFallback = true;
          
          const updateData = {
            uni_deposit_amount: newDeposit,
            uni_farming_deposit: newDeposit,
            uni_farming_active: true,
            uni_farming_start_timestamp: new Date().toISOString(),
            uni_farming_last_update: new Date().toISOString()
          };
          
          logger.info('[UniFarmingRepository] Обновляем users таблицу', { userId, updateData });
          
          const { error: fallbackError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId);
          
          if (fallbackError) {
            logger.error('[UniFarmingRepository] Error adding deposit in users table:', {
              error: fallbackError,
              userId,
              updateData
            });
            return false;
          }
          
          logger.info('[UniFarmingRepository] Успешно обновлено в users таблице');
          return true;
        }
        logger.error('[UniFarmingRepository] Error adding deposit:', error);
        return false;
      }

      logger.info('[UniFarmingRepository] Успешно добавлен депозит в uni_farming_data');
      return true;
    } catch (error) {
      logger.error('[UniFarmingRepository] Exception adding deposit:', error);
      return false;
    }
  }
}

export const uniFarmingRepository = new UniFarmingRepository();