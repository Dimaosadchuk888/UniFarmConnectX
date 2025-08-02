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
          // Нет данных - создаем запись с расчетом из депозитов
          logger.info(`[TonFarmingRepository] Создание новой записи для User ${userId} с расчетом депозитов`);
          
          // 🚨 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Рассчитываем farming_balance из TON депозитов
          const calculatedBalance = await this.calculateUserTonDeposits(parseInt(userId));
          
          const newData: Partial<TonFarmingData> = {
            user_id: parseInt(userId),
            farming_balance: calculatedBalance.toString(), // ✅ Рассчитано из депозитов
            farming_rate: '0.01',
            farming_accumulated: '0',
            boost_active: calculatedBalance > 0, // ✅ Активируем boost если есть депозиты
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          logger.info(`[TonFarmingRepository] Создана запись с farming_balance: ${calculatedBalance} TON для User ${userId}`);
          
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
   * 🚨 КРИТИЧЕСКАЯ ФУНКЦИЯ: Расчет TON депозитов пользователя
   * Используется для корректного создания farming_balance
   */
  private async calculateUserTonDeposits(userId: number): Promise<number> {
    try {
      logger.info(`[TonFarmingRepository] Расчет TON депозитов для User ${userId}`);
      
      const { data: deposits, error } = await supabase
        .from('transactions')
        .select('amount, amount_ton, created_at, type, description')
        .eq('user_id', userId)
        .in('type', ['DEPOSIT', 'TON_DEPOSIT', 'FARMING_REWARD', 'BOOST_PURCHASE'])
        .order('created_at', { ascending: false });
        
      if (error) {
        logger.error(`[TonFarmingRepository] Ошибка при расчете депозитов для User ${userId}:`, error);
        return 0;
      }
      
      if (deposits && deposits.length > 0) {
        const totalTon = deposits.reduce((sum, tx) => {
          // BOOST_PURCHASE использует поле amount, остальные - amount_ton
          if (tx.type === 'BOOST_PURCHASE') {
            const amount = parseFloat(tx.amount || '0');
            return sum + Math.abs(amount); // Конвертируем отрицательное в положительное
          } else {
            const amount = parseFloat(tx.amount_ton || '0');
            return sum + amount;
          }
        }, 0);
        
        logger.info(`[TonFarmingRepository] User ${userId}: найдено ${deposits.length} депозитов, сумма: ${totalTon.toFixed(3)} TON`);
        
        // Логируем детали для диагностики
        deposits.forEach((tx, i) => {
          let displayAmount: number;
          if (tx.type === 'BOOST_PURCHASE') {
            displayAmount = Math.abs(parseFloat(tx.amount || '0'));
          } else {
            displayAmount = parseFloat(tx.amount_ton || '0');
          }
          logger.info(`[TonFarmingRepository] User ${userId} депозит ${i+1}: ${displayAmount} TON (${tx.type}) - ${tx.created_at}`);
        });
        
        return totalTon;
      } else {
        logger.info(`[TonFarmingRepository] User ${userId}: депозитов не найдено`);
        return 0;
      }
    } catch (error) {
      logger.error(`[TonFarmingRepository] Исключение при расчете депозитов для User ${userId}:`, error);
      return 0;
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
        boost_package_id: user.ton_boost_package,
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
        updates.ton_boost_package = data.boost_package_id;
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
        updates.ton_boost_package = data.boost_package_id;
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
        user_id: parseInt(userId), // Исправлено: используем INTEGER как в БД
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
              ton_boost_package: packageId,
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

      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Синхронизируем с users таблицей
      await this.syncToUsers({
        user_id: parseInt(userId),
        farming_balance: newFarmingBalance,
        farming_rate: rate.toString(),
        boost_active: true,
        boost_package_id: packageId,
        boost_expires_at: expiresAt || null,
        farming_start_timestamp: new Date().toISOString(),
        farming_last_update: new Date().toISOString()
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
              ton_boost_package: null,
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
        boost_package_id: user.ton_boost_package,
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