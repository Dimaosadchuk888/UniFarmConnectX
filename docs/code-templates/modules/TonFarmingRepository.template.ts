/**
 * Repository для модуля TON Farming
 * Управление TON фармингом и boost пакетами
 */

import { BaseRepository } from '../BaseRepository';
import { supabase } from '../../core/supabase';
import { 
  TonBoostPackage, 
  TonBoostDeposit,
  User,
  InsertTonBoostDeposit 
} from '../../shared/schema';
import { logger } from '../../utils/logger';

export class TonFarmingRepository extends BaseRepository<TonBoostDeposit> {
  constructor() {
    super('ton_boost_deposits');
  }

  /**
   * Получить активный TON boost пакет пользователя
   */
  async getActiveBoostPackage(userId: number): Promise<{
    packageId: number;
    rate: number;
    name: string;
  } | null> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('ton_boost_package, ton_boost_active, ton_boost_rate')
        .eq('id', userId)
        .single();

      if (error || !user || !user.ton_boost_active) {
        return null;
      }

      // Получаем информацию о пакете
      const { data: package } = await supabase
        .from('ton_boost_packages')
        .select('*')
        .eq('id', user.ton_boost_package)
        .single();

      if (!package) return null;

      return {
        packageId: package.id,
        rate: parseFloat(package.daily_rate || '0'),
        name: package.name
      };
    } catch (error) {
      logger.error('Error fetching active boost package:', error);
      throw error;
    }
  }

  /**
   * Активировать TON boost пакет
   */
  async activateBoostPackage(
    userId: number, 
    packageId: number,
    transactionHash?: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Получаем информацию о пакете
      const { data: package, error: packageError } = await supabase
        .from('ton_boost_packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (packageError || !package) {
        return { success: false, message: 'Package not found' };
      }

      // Проверяем баланс пользователя
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('balance_ton')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return { success: false, message: 'User not found' };
      }

      const userBalance = parseFloat(user.balance_ton || '0');
      const packagePrice = parseFloat(package.price_ton);

      if (userBalance < packagePrice) {
        return { success: false, message: 'Insufficient TON balance' };
      }

      // Создаем запись о депозите
      const { data: deposit, error: depositError } = await supabase
        .from('ton_boost_deposits')
        .insert({
          user_id: userId,
          package_id: packageId,
          amount_ton: package.price_ton,
          daily_rate: package.daily_rate,
          tx_hash: transactionHash
        })
        .select()
        .single();

      if (depositError) throw depositError;

      // Обновляем данные пользователя
      const { error: updateError } = await supabase
        .from('users')
        .update({
          ton_boost_package: packageId,
          ton_boost_active: true,
          ton_boost_rate: package.daily_rate,
          ton_boost_package_id: packageId,
          ton_farming_balance: user.balance_ton, // Весь баланс TON идет в фарминг
          ton_farming_start_timestamp: new Date().toISOString(),
          ton_farming_last_update: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // TODO: Списать TON через TransactionService
      // await transactionService.createBoostPurchase(userId, packagePrice, packageId);

      return {
        success: true,
        message: `TON Boost ${package.name} activated successfully`
      };
    } catch (error) {
      logger.error('Error activating boost package:', error);
      throw error;
    }
  }

  /**
   * Рассчитать накопленный доход от TON фарминга
   */
  async calculateAccumulatedIncome(userId: number): Promise<{
    accumulated: number;
    dailyIncome: number;
    hourlyIncome: number;
  }> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select(`
          ton_farming_balance,
          ton_farming_rate,
          ton_farming_last_update,
          ton_boost_active,
          ton_boost_rate
        `)
        .eq('id', userId)
        .single();

      if (error || !user || !user.ton_boost_active) {
        return { accumulated: 0, dailyIncome: 0, hourlyIncome: 0 };
      }

      const balance = parseFloat(user.ton_farming_balance || '0');
      const rate = parseFloat(user.ton_boost_rate || '0');
      const lastUpdate = user.ton_farming_last_update 
        ? new Date(user.ton_farming_last_update) 
        : new Date();

      // Рассчитываем время в днях
      const now = new Date();
      const timeDiffMs = now.getTime() - lastUpdate.getTime();
      const timeDiffDays = timeDiffMs / (1000 * 60 * 60 * 24);

      // Рассчитываем накопленный доход
      const accumulated = balance * (rate / 100) * timeDiffDays;
      const dailyIncome = balance * (rate / 100);
      const hourlyIncome = dailyIncome / 24;

      return {
        accumulated: Math.max(0, accumulated),
        dailyIncome: Math.max(0, dailyIncome),
        hourlyIncome: Math.max(0, hourlyIncome)
      };
    } catch (error) {
      logger.error('Error calculating accumulated income:', error);
      throw error;
    }
  }

  /**
   * Собрать накопленный доход
   */
  async claimAccumulatedIncome(userId: number): Promise<{
    success: boolean;
    amount: number;
    message: string;
  }> {
    try {
      const income = await this.calculateAccumulatedIncome(userId);
      
      if (income.accumulated <= 0) {
        return {
          success: false,
          amount: 0,
          message: 'No income to claim'
        };
      }

      // Обновляем время последнего сбора
      const { error } = await supabase
        .from('users')
        .update({
          ton_farming_last_update: new Date().toISOString(),
          ton_farming_accumulated: '0'
        })
        .eq('id', userId);

      if (error) throw error;

      // TODO: Начислить TON через TransactionService
      // await transactionService.createBoostReward(userId, income.accumulated);

      return {
        success: true,
        amount: income.accumulated,
        message: `Claimed ${income.accumulated.toFixed(6)} TON`
      };
    } catch (error) {
      logger.error('Error claiming accumulated income:', error);
      throw error;
    }
  }

  /**
   * Получить историю депозитов пользователя
   */
  async getUserDeposits(userId: number): Promise<TonBoostDeposit[]> {
    try {
      const { data, error } = await supabase
        .from('ton_boost_deposits')
        .select(`
          *,
          package:ton_boost_packages(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching user deposits:', error);
      throw error;
    }
  }

  /**
   * Получить доступные boost пакеты
   */
  async getAvailablePackages(): Promise<TonBoostPackage[]> {
    try {
      const { data, error } = await supabase
        .from('ton_boost_packages')
        .select('*')
        .eq('is_active', true)
        .order('id', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching available packages:', error);
      throw error;
    }
  }

  /**
   * Получить статистику TON фарминга
   */
  async getFarmingStats(userId: number): Promise<{
    totalDeposited: number;
    totalEarned: number;
    activePackage: string | null;
    dailyRate: number;
    farmingDays: number;
  }> {
    try {
      // Получаем все депозиты
      const deposits = await this.getUserDeposits(userId);
      const totalDeposited = deposits.reduce(
        (sum, d) => sum + parseFloat(d.amount_ton || '0'), 
        0
      );

      // Получаем текущий пакет
      const activePackage = await this.getActiveBoostPackage(userId);

      // Получаем историю транзакций для расчета заработка
      const { data: rewards } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('transaction_type', 'BOOST_REWARD')
        .eq('currency', 'TON');

      const totalEarned = (rewards || []).reduce(
        (sum, r) => sum + parseFloat(r.amount || '0'), 
        0
      );

      // Рассчитываем количество дней фарминга
      const { data: user } = await supabase
        .from('users')
        .select('ton_farming_start_timestamp')
        .eq('id', userId)
        .single();

      let farmingDays = 0;
      if (user?.ton_farming_start_timestamp) {
        const start = new Date(user.ton_farming_start_timestamp);
        const now = new Date();
        farmingDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        totalDeposited,
        totalEarned,
        activePackage: activePackage?.name || null,
        dailyRate: activePackage?.rate || 0,
        farmingDays
      };
    } catch (error) {
      logger.error('Error fetching farming stats:', error);
      throw error;
    }
  }

  /**
   * Деактивировать boost пакет (админ функция)
   */
  async deactivateBoostPackage(userId: number): Promise<void> {
    try {
      await supabase
        .from('users')
        .update({
          ton_boost_active: false,
          ton_boost_package: 0,
          ton_boost_rate: '0',
          ton_farming_balance: '0'
        })
        .eq('id', userId);
    } catch (error) {
      logger.error('Error deactivating boost package:', error);
      throw error;
    }
  }
}

export const tonFarmingRepository = new TonFarmingRepository();