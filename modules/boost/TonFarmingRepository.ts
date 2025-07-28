import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger';
import { UnifiedTransactionService } from '../../core/TransactionService';

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
    // Таблица ton_farming_data существует в БД
    logger.info('[TonFarmingRepository] Initializing with ton_farming_data table (production mode)');
  }

  /**
   * КРИТИЧЕСКОЕ УЛУЧШЕНИЕ: Безопасная активация TON Boost с гарантированным созданием депозита
   * Этот метод обеспечивает создание записи в ton_farming_data И синхронизацию с users
   */
  async safeActivateBoost(userId: string, packageId: number, rate: number, depositAmount: number, expiresAt?: string): Promise<{
    success: boolean;
    message: string;
    tonFarmingCreated: boolean;
    usersUpdated: boolean;
    accumulatedBalance: number;
  }> {
    const userIdStr = userId.toString();
    let tonFarmingCreated = false;
    let usersUpdated = false;
    let accumulatedBalance = 0;

    try {
      logger.info('[TonFarmingRepository] 🔄 SAFE ACTIVATION START', {
        userId: userIdStr,
        packageId,
        depositAmount,
        rate
      });

      // ШАГ 1: Получаем существующую запись для накопления баланса
      const existingRecord = await this.getByUserId(userIdStr);
      if (existingRecord && existingRecord.farming_balance) {
        const currentBalance = parseFloat(existingRecord.farming_balance) || 0;
        accumulatedBalance = currentBalance + depositAmount;
        logger.info('[TonFarmingRepository] 📈 НАКОПЛЕНИЕ ДЕПОЗИТА', {
          userId: userIdStr,
          currentBalance,
          newDeposit: depositAmount,
          accumulatedBalance
        });
      } else {
        accumulatedBalance = depositAmount;
        logger.info('[TonFarmingRepository] 🆕 ПЕРВЫЙ ДЕПОЗИТ', {
          userId: userIdStr,
          accumulatedBalance
        });
      }

      // ШАГ 2: КРИТИЧЕСКИ ВАЖНО - Создание/обновление записи в ton_farming_data
      const farmingData = {
        user_id: userIdStr, // ВАЖНО: строковый формат для совместимости с существующими данными
        boost_active: true,
        boost_package_id: packageId,
        farming_rate: rate.toString(),
        farming_balance: accumulatedBalance.toString(), // Накопленный баланс
        boost_expires_at: expiresAt || null,
        farming_start_timestamp: new Date().toISOString(),
        farming_last_update: new Date().toISOString(),
        daily_income: (accumulatedBalance * rate).toString(), // Рассчитываем дневной доход
        total_earned: '0',
        farming_accumulated: '0',
        updated_at: new Date().toISOString()
      };

      logger.info('[TonFarmingRepository] 📝 СОЗДАНИЕ ЗАПИСИ В ton_farming_data', {
        userId: userIdStr,
        farmingData: {
          farming_balance: farmingData.farming_balance,
          farming_rate: farmingData.farming_rate,
          daily_income: farmingData.daily_income,
          boost_package_id: farmingData.boost_package_id
        }
      });

      const { data: farmingResult, error: farmingError } = await supabase
        .from(this.tableName)
        .upsert(farmingData, {
          onConflict: 'user_id'
        })
        .select();

      if (farmingError) {
        logger.error('[TonFarmingRepository] ❌ ОШИБКА СОЗДАНИЯ В ton_farming_data', {
          error: farmingError,
          errorCode: farmingError.code,
          userId: userIdStr
        });
        tonFarmingCreated = false;
      } else {
        logger.info('[TonFarmingRepository] ✅ УСПЕШНО СОЗДАНА ЗАПИСЬ В ton_farming_data', {
          userId: userIdStr,
          recordId: farmingResult?.[0]?.id,
          farming_balance: farmingResult?.[0]?.farming_balance
        });
        tonFarmingCreated = true;
      }

      // ШАГ 3: Синхронизация с таблицей users для планировщика
      const { error: usersError } = await supabase
        .from('users')
        .update({
          ton_boost_active: true, // КРИТИЧНО для планировщика
          ton_boost_package: packageId,
          ton_boost_package_id: packageId, // Дублируем для совместимости
          ton_boost_rate: rate,
          ton_farming_balance: accumulatedBalance.toString(), // Синхронизируем баланс
          ton_farming_rate: rate.toString(),
          ton_farming_start_timestamp: new Date().toISOString(),
          ton_farming_last_update: new Date().toISOString()
        })
        .eq('id', parseInt(userIdStr));

      if (usersError) {
        logger.error('[TonFarmingRepository] ❌ ОШИБКА ОБНОВЛЕНИЯ users', {
          error: usersError,
          userId: userIdStr
        });
        usersUpdated = false;
      } else {
        logger.info('[TonFarmingRepository] ✅ УСПЕШНО ОБНОВЛЕНА ТАБЛИЦА users', {
          userId: userIdStr,
          ton_boost_active: true,
          ton_boost_package: packageId,
          ton_farming_balance: accumulatedBalance
        });
        usersUpdated = true;
      }

      // ШАГ 4: Анализ результатов
      const overallSuccess = tonFarmingCreated && usersUpdated;
      
      if (overallSuccess) {
        logger.info('[TonFarmingRepository] 🎉 ПОЛНЫЙ УСПЕХ - ОБЕ ТАБЛИЦЫ ОБНОВЛЕНЫ', {
          userId: userIdStr,
          packageId,
          accumulatedBalance,
          tonFarmingCreated,
          usersUpdated
        });
        
        return {
          success: true,
          message: `TON Boost успешно активирован. Депозит: ${accumulatedBalance} TON, дневной доход: ${(accumulatedBalance * rate).toFixed(6)} TON`,
          tonFarmingCreated,
          usersUpdated,
          accumulatedBalance
        };
      } else {
        const partialSuccessMsg = [];
        if (tonFarmingCreated) partialSuccessMsg.push('ton_farming_data ✅');
        if (usersUpdated) partialSuccessMsg.push('users ✅');
        
        logger.warn('[TonFarmingRepository] ⚠️  ЧАСТИЧНЫЙ УСПЕХ', {
          userId: userIdStr,
          tonFarmingCreated,
          usersUpdated,
          partialSuccessMsg: partialSuccessMsg.join(', ')
        });
        
        return {
          success: false,
          message: `Частичная активация: ${partialSuccessMsg.join(', ')}. Требуется ручная проверка.`,
          tonFarmingCreated,
          usersUpdated,
          accumulatedBalance
        };
      }

    } catch (error) {
      logger.error('[TonFarmingRepository] 💥 КРИТИЧЕСКАЯ ОШИБКА В safeActivateBoost', {
        error,
        userId: userIdStr,
        packageId,
        depositAmount
      });
      
      return {
        success: false,
        message: `Критическая ошибка активации: ${error}`,
        tonFarmingCreated,
        usersUpdated,
        accumulatedBalance
      };
    }
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
        .eq('user_id', parseInt(userId))
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
      if (data.boost_package_id !== undefined) {
        updates.ton_boost_package_id = data.boost_package_id;
        updates.ton_boost_package = data.boost_package_id; // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: синхронизация с планировщиком
      }
      if (data.boost_expires_at !== undefined) updates.ton_boost_expires_at = data.boost_expires_at;
      
      if (Object.keys(updates).length === 0) return;
      
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', data.user_id);
        
      if (error) {
        logger.warn('[TonFarmingRepository] Failed to sync to users:', error);
      } else {
        logger.info('[TonFarmingRepository] ✅ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА', {
          userId: data.user_id,
          updatedFields: Object.keys(updates),
          values: updates,
          schedulerReady: updates.ton_boost_package ? 'YES' : 'NO'
        });
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
      if (data.boost_package_id !== undefined) {
        updates.ton_boost_package_id = data.boost_package_id;
        updates.ton_boost_package = data.boost_package_id; // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: синхронизация с планировщиком  
      }
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
  async activateBoost(userId: string, packageId: number, rate: number, expiresAt?: string, depositAmount?: number): Promise<boolean> {
    try {
      // Сначала получаем существующую запись
      const existingRecord = await this.getByUserId(userId.toString());
      
      let newFarmingBalance: string;
      if (existingRecord && existingRecord.farming_balance) {
        // Накапливаем баланс вместо замены
        const currentBalance = parseFloat(existingRecord.farming_balance) || 0;
        const depositToAdd = depositAmount || 0;
        newFarmingBalance = (currentBalance + depositToAdd).toString();
        
        logger.info('[TonFarmingRepository] Накопление депозита:', {
          userId,
          currentBalance,
          depositToAdd,
          newFarmingBalance
        });
      } else {
        // Первый депозит
        newFarmingBalance = depositAmount ? depositAmount.toString() : '0';
        logger.info('[TonFarmingRepository] Первый депозит:', {
          userId,
          depositAmount,
          newFarmingBalance
        });
      }
      
      // Подготавливаем данные для upsert
      const upsertData = {
        user_id: userId.toString(), // ✅ ИСПРАВЛЕНО: используем STRING вместо INTEGER
        boost_active: true,
        boost_package_id: packageId,
        farming_rate: rate.toString(),
        farming_balance: newFarmingBalance, // Используем накопленный баланс
        boost_expires_at: expiresAt || null,
        farming_start_timestamp: new Date().toISOString(),
        farming_last_update: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      logger.info('[TonFarmingRepository] Выполняем upsert с данными:', {
        userId,
        upsertData,
        existingBalance: existingRecord?.farming_balance,
        depositAmount
      });
      
      const { data: upsertResult, error } = await supabase
        .from(this.tableName)
        .upsert(upsertData, {
          onConflict: 'user_id'
        })
        .select();

      if (error) {
        logger.error('[TonFarmingRepository] Ошибка upsert операции:', {
          error,
          errorCode: error.code,
          errorMessage: error.message,
          userId,
          packageId,
          newFarmingBalance
        });
        
        if (error.code === '42P01') {
          // Таблица не существует, используем fallback
          this.useFallback = true;
          
          // Получаем текущий баланс из таблицы users для накопления
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('ton_farming_balance')
            .eq('id', userId)
            .single();
          
          let newFallbackBalance: string;
          if (userData && userData.ton_farming_balance) {
            // Накапливаем баланс
            const currentBalance = parseFloat(userData.ton_farming_balance) || 0;
            const depositToAdd = depositAmount || 0;
            newFallbackBalance = (currentBalance + depositToAdd).toString();
          } else {
            // Первый депозит
            newFallbackBalance = depositAmount ? depositAmount.toString() : '0';
          }
          
          const { error: fallbackError } = await supabase
            .from('users')
            .update({
              ton_boost_active: true,
              ton_boost_package_id: packageId,
              ton_farming_rate: rate.toString(),
              ton_farming_balance: newFallbackBalance, // Используем накопленный баланс
              ton_boost_expires_at: expiresAt || null,
              ton_farming_start_timestamp: new Date().toISOString(),
              ton_farming_last_update: new Date().toISOString()
            })
            .eq('id', userId);
          
          if (fallbackError) {
            logger.error('[TonFarmingRepository] Error activating boost in users table:', fallbackError);
            return false;
          }
          
          // ИСПРАВЛЕНИЕ: Создаем транзакцию депозита TON для прозрачности (fallback случай)
          if (depositAmount && depositAmount > 0) {
            const transactionService = new UnifiedTransactionService();
            await transactionService.createTransaction({
              user_id: parseInt(userId),
              type: 'BOOST_PURCHASE', // Используем существующий тип
              amount_ton: depositAmount,
              currency: 'TON',
              status: 'completed',
              description: `TON Boost deposit (Package ${packageId})`,
              metadata: {
                original_type: 'TON_BOOST_DEPOSIT',
                boost_package_id: packageId,
                transaction_source: 'ton_farming_repository'
              }
            });
            
            logger.info('[TonFarmingRepository] TON deposit transaction created (fallback)', {
              userId,
              amount: depositAmount,
              packageId
            });
          }
          
          return true;
        }
        logger.error('[TonFarmingRepository] Error activating boost:', error);
        return false;
      }
      
      // Логируем успешный upsert
      logger.info('[TonFarmingRepository] Upsert успешно выполнен:', {
        userId,
        packageId,
        newFarmingBalance,
        farming_rate: rate,
        upsertResult
      });

      // ИСПРАВЛЕНИЕ: Создаем транзакцию депозита TON для прозрачности
      if (depositAmount && depositAmount > 0) {
        const transactionService = new UnifiedTransactionService();
        await transactionService.createTransaction({
          user_id: parseInt(userId),
          type: 'BOOST_PURCHASE', // Используем существующий тип
          amount_ton: depositAmount,
          currency: 'TON',
          status: 'completed',
          description: `TON Boost deposit (Package ${packageId})`,
          metadata: {
            original_type: 'TON_BOOST_DEPOSIT',
            boost_package_id: packageId,
            transaction_source: 'ton_farming_repository'
          }
        });
        
        logger.info('[TonFarmingRepository] TON deposit transaction created', {
          userId,
          amount: depositAmount,
          packageId
        });
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