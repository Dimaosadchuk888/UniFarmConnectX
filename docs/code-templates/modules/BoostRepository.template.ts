/**
 * Repository для модуля Boost
 * Управление boost пакетами и их активацией
 */

import { BaseRepository } from '../BaseRepository';
import { supabase } from '../../core/supabase';
import { 
  BoostPackage, 
  BoostDeposit,
  UserBoost,
  InsertBoostDeposit,
  InsertUserBoost 
} from '../../shared/schema';
import { logger } from '../../utils/logger';
import { addDays } from 'date-fns';

export class BoostRepository extends BaseRepository<BoostDeposit> {
  constructor() {
    super('boost_deposits');
  }

  /**
   * Получить доступные UNI boost пакеты
   */
  async getAvailableBoostPackages(): Promise<BoostPackage[]> {
    try {
      const { data, error } = await supabase
        .from('boost_packages')
        .select('*')
        .eq('is_active', true)
        .order('boost_percentage', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching boost packages:', error);
      throw error;
    }
  }

  /**
   * Получить активные boost пользователя
   */
  async getUserActiveBoosts(userId: number): Promise<UserBoost[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('user_boosts')
        .select(`
          *,
          package:boost_packages(*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .gte('expires_at', now);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching user active boosts:', error);
      throw error;
    }
  }

  /**
   * Активировать boost пакет
   */
  async activateBoostPackage(
    userId: number,
    packageId: number
  ): Promise<{
    success: boolean;
    boostId?: number;
    expiresAt?: Date;
    message: string;
  }> {
    try {
      // Получаем информацию о пакете
      const { data: package, error: packageError } = await supabase
        .from('boost_packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (packageError || !package) {
        return { success: false, message: 'Boost package not found' };
      }

      // Проверяем баланс пользователя
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('balance_uni')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return { success: false, message: 'User not found' };
      }

      const userBalance = parseFloat(user.balance_uni || '0');
      const packagePrice = parseFloat(package.price_uni);

      if (userBalance < packagePrice) {
        return { success: false, message: 'Insufficient UNI balance' };
      }

      // Проверяем, нет ли уже активного boost этого типа
      const activeBoosts = await this.getUserActiveBoosts(userId);
      const hasActiveBoost = activeBoosts.some(
        boost => boost.boost_package_id === packageId
      );

      if (hasActiveBoost) {
        return { success: false, message: 'This boost is already active' };
      }

      // Создаем запись о покупке
      const { data: deposit, error: depositError } = await supabase
        .from('boost_deposits')
        .insert({
          user_id: userId,
          package_id: packageId,
          amount_uni: package.price_uni,
          boost_percentage: package.boost_percentage
        })
        .select()
        .single();

      if (depositError) throw depositError;

      // Создаем активный boost для пользователя
      const expiresAt = addDays(new Date(), package.duration_days);
      const { data: userBoost, error: boostError } = await supabase
        .from('user_boosts')
        .insert({
          user_id: userId,
          boost_package_id: packageId,
          boost_percentage: package.boost_percentage,
          is_active: true,
          activated_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (boostError) throw boostError;

      // TODO: Списать UNI через TransactionService
      // await transactionService.createBoostPurchase(userId, packagePrice, packageId);

      return {
        success: true,
        boostId: userBoost.id,
        expiresAt,
        message: `Boost ${package.name} activated successfully until ${expiresAt.toLocaleDateString()}`
      };
    } catch (error) {
      logger.error('Error activating boost package:', error);
      throw error;
    }
  }

  /**
   * Рассчитать общий boost процент пользователя
   */
  async calculateTotalBoostPercentage(userId: number): Promise<number> {
    try {
      const activeBoosts = await this.getUserActiveBoosts(userId);
      
      // Суммируем все активные boost проценты
      const totalBoost = activeBoosts.reduce(
        (sum, boost) => sum + parseFloat(boost.boost_percentage || '0'),
        0
      );

      return totalBoost;
    } catch (error) {
      logger.error('Error calculating total boost percentage:', error);
      throw error;
    }
  }

  /**
   * Применить boost к сумме
   */
  async applyBoost(userId: number, baseAmount: number): Promise<{
    boostedAmount: number;
    boostPercentage: number;
    boostBonus: number;
  }> {
    try {
      const boostPercentage = await this.calculateTotalBoostPercentage(userId);
      const boostBonus = baseAmount * (boostPercentage / 100);
      const boostedAmount = baseAmount + boostBonus;

      return {
        boostedAmount,
        boostPercentage,
        boostBonus
      };
    } catch (error) {
      logger.error('Error applying boost:', error);
      throw error;
    }
  }

  /**
   * Получить историю boost покупок
   */
  async getUserBoostHistory(userId: number): Promise<BoostDeposit[]> {
    try {
      const { data, error } = await supabase
        .from('boost_deposits')
        .select(`
          *,
          package:boost_packages(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching boost history:', error);
      throw error;
    }
  }

  /**
   * Деактивировать истекшие boost
   */
  async deactivateExpiredBoosts(): Promise<number> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('user_boosts')
        .update({ is_active: false })
        .eq('is_active', true)
        .lt('expires_at', now)
        .select();

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      logger.error('Error deactivating expired boosts:', error);
      throw error;
    }
  }

  /**
   * Получить статистику boost
   */
  async getBoostStats(userId: number): Promise<{
    totalSpent: number;
    activeBoosts: number;
    totalBoostPercentage: number;
    lifetimeBoosts: number;
  }> {
    try {
      // Получаем историю покупок
      const history = await this.getUserBoostHistory(userId);
      const totalSpent = history.reduce(
        (sum, h) => sum + parseFloat(h.amount_uni || '0'),
        0
      );

      // Получаем активные boost
      const activeBoosts = await this.getUserActiveBoosts(userId);
      const totalBoostPercentage = await this.calculateTotalBoostPercentage(userId);

      return {
        totalSpent,
        activeBoosts: activeBoosts.length,
        totalBoostPercentage,
        lifetimeBoosts: history.length
      };
    } catch (error) {
      logger.error('Error fetching boost stats:', error);
      throw error;
    }
  }

  /**
   * Создать новый boost пакет (админ функция)
   */
  async createBoostPackage(packageData: {
    name: string;
    description: string;
    boost_percentage: string;
    price_uni: string;
    duration_days: number;
    max_purchases?: number;
  }): Promise<BoostPackage> {
    try {
      const { data, error } = await supabase
        .from('boost_packages')
        .insert({
          ...packageData,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating boost package:', error);
      throw error;
    }
  }

  /**
   * Деактивировать boost пользователя (админ функция)
   */
  async deactivateUserBoost(userId: number, boostId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_boosts')
        .update({ is_active: false })
        .eq('id', boostId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error deactivating user boost:', error);
      throw error;
    }
  }
}

export const boostRepository = new BoostRepository();