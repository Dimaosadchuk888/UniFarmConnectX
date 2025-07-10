/**
 * Repository для модуля Airdrop
 * Управление airdrop кампаниями и распределением токенов
 */

import { BaseRepository } from '../BaseRepository';
import { supabase } from '../../core/supabase';
import { 
  Airdrop, 
  AirdropParticipant, 
  InsertAirdrop, 
  InsertAirdropParticipant 
} from '../../shared/schema';
import { logger } from '../../utils/logger';

export class AirdropRepository extends BaseRepository<Airdrop> {
  constructor() {
    super('airdrops');
  }

  /**
   * Получить активные airdrop кампании
   */
  async getActiveAirdrops(): Promise<Airdrop[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('airdrops')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching active airdrops:', error);
      throw error;
    }
  }

  /**
   * Проверить право пользователя на участие в airdrop
   */
  async checkEligibility(
    userId: number, 
    airdropId: number
  ): Promise<{
    eligible: boolean;
    reason?: string;
  }> {
    try {
      // Получаем данные airdrop
      const airdrop = await this.getById(airdropId);
      if (!airdrop) {
        return { eligible: false, reason: 'Airdrop not found' };
      }

      // Проверяем, активен ли airdrop
      const now = new Date();
      if (!airdrop.is_active || 
          now < new Date(airdrop.start_date) || 
          now > new Date(airdrop.end_date)) {
        return { eligible: false, reason: 'Airdrop not active' };
      }

      // Проверяем, не участвовал ли уже
      const { data: existingClaim } = await supabase
        .from('airdrop_participants')
        .select('id')
        .eq('user_id', userId)
        .eq('airdrop_id', airdropId)
        .single();

      if (existingClaim) {
        return { eligible: false, reason: 'Already participated' };
      }

      // Проверяем условия участия
      if (airdrop.conditions) {
        const conditions = airdrop.conditions as any;
        
        // Пример условий
        if (conditions.minBalance) {
          const { data: user } = await supabase
            .from('users')
            .select('balance_uni, balance_ton')
            .eq('id', userId)
            .single();

          if (!user) return { eligible: false, reason: 'User not found' };

          const balance = conditions.currency === 'UNI' 
            ? parseFloat(user.balance_uni || '0')
            : parseFloat(user.balance_ton || '0');

          if (balance < conditions.minBalance) {
            return { 
              eligible: false, 
              reason: `Minimum balance required: ${conditions.minBalance} ${conditions.currency}` 
            };
          }
        }

        // TODO: Добавить другие проверки условий
      }

      return { eligible: true };
    } catch (error) {
      logger.error('Error checking airdrop eligibility:', error);
      throw error;
    }
  }

  /**
   * Зарегистрировать участника в airdrop
   */
  async claimAirdrop(
    userId: number, 
    airdropId: number
  ): Promise<{
    success: boolean;
    amount?: number;
    currency?: string;
    message: string;
  }> {
    try {
      // Проверяем право на участие
      const eligibility = await this.checkEligibility(userId, airdropId);
      if (!eligibility.eligible) {
        return {
          success: false,
          message: eligibility.reason || 'Not eligible'
        };
      }

      // Получаем данные airdrop
      const airdrop = await this.getById(airdropId);
      if (!airdrop) {
        return { success: false, message: 'Airdrop not found' };
      }

      // Рассчитываем сумму
      let amount = airdrop.amount_per_user 
        ? parseFloat(airdrop.amount_per_user) 
        : 0;

      // Если сумма не фиксированная, рассчитываем долю
      if (!amount && airdrop.total_amount) {
        const { count } = await supabase
          .from('airdrop_participants')
          .select('id', { count: 'exact' })
          .eq('airdrop_id', airdropId);

        const totalParticipants = (count || 0) + 1;
        amount = parseFloat(airdrop.total_amount) / totalParticipants;
      }

      // Создаем запись участника
      const { data, error } = await supabase
        .from('airdrop_participants')
        .insert({
          user_id: userId,
          airdrop_id: airdropId,
          amount: amount.toString(),
          currency: airdrop.currency,
          claimed_at: new Date().toISOString(),
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // TODO: Начислить токены через TransactionService
      // await transactionService.createAirdropClaim(userId, amount, airdrop.currency);

      return {
        success: true,
        amount,
        currency: airdrop.currency,
        message: `Successfully claimed ${amount} ${airdrop.currency} from ${airdrop.title}`
      };
    } catch (error) {
      logger.error('Error claiming airdrop:', error);
      throw error;
    }
  }

  /**
   * Получить историю участий пользователя в airdrop
   */
  async getUserAirdropHistory(userId: number): Promise<AirdropParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('airdrop_participants')
        .select(`
          *,
          airdrop:airdrops(*)
        `)
        .eq('user_id', userId)
        .order('claimed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching user airdrop history:', error);
      throw error;
    }
  }

  /**
   * Получить статистику airdrop кампании
   */
  async getAirdropStats(airdropId: number): Promise<{
    totalParticipants: number;
    totalDistributed: number;
    averageAmount: number;
    remainingAmount: number;
  }> {
    try {
      const airdrop = await this.getById(airdropId);
      if (!airdrop) throw new Error('Airdrop not found');

      const { data: participants, error } = await supabase
        .from('airdrop_participants')
        .select('amount')
        .eq('airdrop_id', airdropId);

      if (error) throw error;

      const totalParticipants = participants?.length || 0;
      const totalDistributed = participants?.reduce(
        (sum, p) => sum + parseFloat(p.amount || '0'), 
        0
      ) || 0;
      const averageAmount = totalParticipants > 0 
        ? totalDistributed / totalParticipants 
        : 0;
      const remainingAmount = parseFloat(airdrop.total_amount) - totalDistributed;

      return {
        totalParticipants,
        totalDistributed,
        averageAmount,
        remainingAmount
      };
    } catch (error) {
      logger.error('Error fetching airdrop stats:', error);
      throw error;
    }
  }

  /**
   * Создать новую airdrop кампанию (админ функция)
   */
  async createAirdrop(airdropData: InsertAirdrop): Promise<Airdrop> {
    try {
      const { data, error } = await supabase
        .from('airdrops')
        .insert({
          ...airdropData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating airdrop:', error);
      throw error;
    }
  }

  /**
   * Завершить airdrop кампанию (админ функция)
   */
  async completeAirdrop(airdropId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('airdrops')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', airdropId);

      if (error) throw error;

      // Обновляем статус всех участников
      await supabase
        .from('airdrop_participants')
        .update({ status: 'completed' })
        .eq('airdrop_id', airdropId);
    } catch (error) {
      logger.error('Error completing airdrop:', error);
      throw error;
    }
  }
}

export const airdropRepository = new AirdropRepository();