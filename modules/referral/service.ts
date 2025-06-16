/**
 * Серверный сервис для обработки реферальных ссылок и кодов
 * Использует только Supabase API через централизованный клиент
 */

import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger';
import { REFERRAL_TABLES, REFERRAL_CONFIG } from './model';

export class ReferralService {

  /**
   * Генерирует уникальный реферальный код для пользователя
   */
  async generateReferralCode(userId: string): Promise<string> {
    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const refCode = `${REFERRAL_CONFIG.REF_CODE_PREFIX}${userId.slice(-4)}${random}${timestamp.toString().slice(-4)}`;
      
      logger.info('[ReferralService] Генерация реферального кода для пользователя', { userId, refCode });
      return refCode;
    } catch (error) {
      logger.error('[ReferralService] Ошибка генерации реферального кода', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Получает статистику рефералов для пользователя через Supabase API
   */
  async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    totalEarnings: string;
    referralCode: string | null;
    recentReferrals: any[];
  }> {
    try {
      // Получаем пользователя и его реферальный код
      const { data: user, error: userError } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .select('*')
        .eq('id', parseInt(userId))
        .single();

      if (userError || !user || !user.ref_code) {
        return { 
          totalReferrals: 0, 
          totalEarnings: "0", 
          referralCode: null, 
          recentReferrals: [] 
        };
      }

      // Считаем всех приглашенных пользователей через referred_by поле
      const { data: invitedUsers, error: invitedError } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .select('*')
        .eq('referred_by', user.ref_code);

      if (invitedError) {
        logger.error('[ReferralService] Ошибка получения приглашенных пользователей', { error: invitedError.message });
        return { 
          totalReferrals: 0, 
          totalEarnings: "0", 
          referralCode: user.ref_code, 
          recentReferrals: [] 
        };
      }

      // Получаем транзакции с реферальными наградами
      const { data: referralTransactions } = await supabase
        .from('transactions')
        .select('amount_uni')
        .eq('user_id', parseInt(userId))
        .eq('type', 'REFERRAL_REWARD');

      const totalEarnings = (referralTransactions || [])
        .reduce((sum, tx) => sum + parseFloat(tx.amount_uni || '0'), 0)
        .toFixed(6);

      const recentReferrals = (invitedUsers || [])
        .filter(u => u.created_at && 
          (new Date().getTime() - new Date(u.created_at).getTime()) < 30 * 24 * 60 * 60 * 1000
        )
        .slice(0, 10);

      return {
        totalReferrals: (invitedUsers || []).length,
        totalEarnings,
        referralCode: user.ref_code,
        recentReferrals
      };
    } catch (error) {
      logger.error('[ReferralService] Ошибка получения статистики рефералов', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Получает рефералов пользователя через Supabase API
   */
  async getReferralsByUserId(userId: string): Promise<any[]> {
    try {
      // Получаем реферальный код пользователя
      const { data: user, error: userError } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .select('ref_code')
        .eq('id', parseInt(userId))
        .single();

      if (userError || !user || !user.ref_code) {
        return [];
      }

      // Получаем всех пользователей, приглашенных этим реферальным кодом
      const { data: invitedUsers, error: invitedError } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .select('id, username, created_at, balance_uni, balance_ton')
        .eq('referred_by', user.ref_code);

      if (invitedError) {
        logger.error('[ReferralService] Ошибка получения рефералов', { error: invitedError.message });
        return [];
      }

      return (invitedUsers || []).map(invitedUser => ({
        id: invitedUser.id,
        name: invitedUser.username || 'Unknown',
        username: invitedUser.username,
        joined_date: invitedUser.created_at,
        balance_uni: invitedUser.balance_uni || "0",
        balance_ton: invitedUser.balance_ton || "0",
        level: 1 // Direct referral
      }));
    } catch (error) {
      logger.error('[ReferralService] Ошибка получения рефералов по ID пользователя', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Валидирует реферальный код через Supabase API
   */
  async validateReferralCode(refCode: string): Promise<{ valid: boolean; cyclicError?: boolean }> {
    try {
      if (!refCode || refCode.length < 6) {
        return { valid: false };
      }

      // Проверяем существование пользователя с таким реферальным кодом
      const { data: referrer, error } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .select('id, ref_code')
        .eq('ref_code', refCode)
        .single();

      if (error || !referrer) {
        return { valid: false };
      }

      return { valid: true };
    } catch (error) {
      logger.error('[ReferralService] Ошибка валидации реферального кода', { error: error instanceof Error ? error.message : String(error) });
      return { valid: false };
    }
  }

  /**
   * Обрабатывает реферальную связь между пользователями через Supabase API
   */
  async processReferral(refCode: string, newUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Находим пользователя с таким реферальным кодом
      const { data: inviter, error: inviterError } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .select('*')
        .eq('ref_code', refCode)
        .single();

      if (inviterError || !inviter) {
        logger.warn(`[REFERRAL] Реферальный код ${refCode} не найден`, {
          refCode,
          newUserId
        });
        return { success: false, error: 'Реферальный код не найден' };
      }

      // Обновляем нового пользователя, указывая referred_by
      const { error: updateError } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .update({ referred_by: refCode })
        .eq('id', parseInt(newUserId));

      if (updateError) {
        logger.error('[ReferralService] Ошибка обновления пользователя', { error: updateError.message });
        return { success: false, error: 'Ошибка обновления данных пользователя' };
      }

      // Создаем транзакцию о реферальной награде
      await supabase
        .from('transactions')
        .insert({
          user_id: inviter.id,
          type: 'REFERRAL_REWARD',
          amount_uni: 10,
          amount_ton: 0,
          description: `Referral reward for inviting user ${newUserId}`
        });

      logger.info(`[REFERRAL] Успешно обработана реферальная связь: ${newUserId} → ${inviter.id}`, {
        newUserId,
        inviterId: inviter.id,
        refCode,
        rewardUni: "10"
      });

      return { success: true };
    } catch (error) {
      logger.error('[ReferralService] Ошибка обработки реферала:', {
        refCode,
        newUserId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return { success: false, error: 'Внутренняя ошибка сервера' };
    }
  }

  /**
   * Построение цепочки рефереров до 20 уровней через Supabase API
   */
  async buildReferrerChain(userId: string): Promise<string[]> {
    try {
      const referrerChain: string[] = [];
      let currentUserId = userId;
      let level = 0;
      const maxLevels = 20;

      while (level < maxLevels) {
        // Получаем пользователя и его реферера
        const { data: user, error } = await supabase
          .from(REFERRAL_TABLES.USERS)
          .select('id, referred_by')
          .eq('id', parseInt(currentUserId))
          .single();

        if (error || !user || !user.referred_by) {
          break;
        }

        // Находим пользователя, который пригласил текущего
        const { data: referrer, error: referrerError } = await supabase
          .from(REFERRAL_TABLES.USERS)
          .select('id, ref_code')
          .eq('ref_code', user.referred_by)
          .single();

        if (referrerError || !referrer) {
          break;
        }

        referrerChain.push(referrer.id.toString());
        currentUserId = referrer.id.toString();
        level++;

        // Предотвращаем циклические ссылки
        if (referrerChain.includes(currentUserId)) {
          logger.warn('[ReferralService] Обнаружена циклическая ссылка в реферальной цепи', {
            userId,
            level,
            currentUserId
          });
          break;
        }
      }

      logger.info('[ReferralService] Построена реферальная цепочка', {
        userId,
        chainLength: referrerChain.length,
        referrerChain
      });

      return referrerChain;
    } catch (error) {
      logger.error('[ReferralService] Ошибка построения цепочки рефереров', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Распределение реферальных наград от дохода фарминга/буста
   */
  async distributeReferralRewards(
    sourceUserId: string,
    amount: string,
    sourceType: 'uni_farming' | 'ton_boost',
    currency: 'UNI' | 'TON' = 'UNI'
  ): Promise<{ success: boolean; distributed: number; totalAmount: string }> {
    try {
      logger.info('[ReferralService] Начало распределения реферальных наград', {
        sourceUserId,
        amount,
        sourceType,
        currency
      });

      // Получаем цепочку рефереров
      const referrerChain = await this.buildReferrerChain(sourceUserId);
      
      if (referrerChain.length === 0) {
        logger.info('[ReferralService] Нет рефереров для распределения наград', { sourceUserId });
        return { success: true, distributed: 0, totalAmount: '0' };
      }

      // Импортируем логику расчета комиссий
      const { DeepReferralLogic } = await import('./logic/deepReferral');
      const commissions = DeepReferralLogic.calculateReferralCommissions(amount, referrerChain);

      let distributedCount = 0;
      let totalDistributedAmount = 0;

      // Создаем транзакции для каждого реферера
      for (const commission of commissions) {
        try {
          const { error: txError } = await supabase
            .from('transactions')
            .insert({
              user_id: parseInt(commission.userId),
              type: 'REFERRAL_REWARD',
              amount_uni: currency === 'UNI' ? parseFloat(commission.amount) : 0,
              amount_ton: currency === 'TON' ? parseFloat(commission.amount) : 0,
              currency: currency,
              status: 'completed',
              description: `Реферальная награда ${commission.level} уровня от ${sourceType}`,
              source_user_id: parseInt(sourceUserId),
              created_at: new Date().toISOString()
            });

          if (!txError) {
            // Обновляем баланс получателя награды
            const balanceField = currency === 'UNI' ? 'balance_uni' : 'balance_ton';
            
            const { data: recipient, error: getUserError } = await supabase
              .from(REFERRAL_TABLES.USERS)
              .select(balanceField)
              .eq('id', parseInt(commission.userId))
              .single();

            if (!getUserError && recipient) {
              const currentBalance = parseFloat((recipient as any)[balanceField] || '0');
              const newBalance = currentBalance + parseFloat(commission.amount);
              
              const updateData: any = {};
              updateData[balanceField] = newBalance.toString();

              await supabase
                .from(REFERRAL_TABLES.USERS)
                .update(updateData)
                .eq('id', parseInt(commission.userId));

              distributedCount++;
              totalDistributedAmount += parseFloat(commission.amount);

              logger.info('[ReferralService] Реферальная награда начислена', {
                recipientId: commission.userId,
                level: commission.level,
                amount: commission.amount,
                currency,
                sourceType,
                sourceUserId
              });
            }
          }
        } catch (error) {
          logger.error('[ReferralService] Ошибка начисления реферальной награды', {
            recipientId: commission.userId,
            level: commission.level,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      logger.info('[ReferralService] Завершено распределение реферальных наград', {
        sourceUserId,
        sourceType,
        distributedCount,
        totalDistributedAmount: totalDistributedAmount.toFixed(6),
        currency
      });

      return {
        success: true,
        distributed: distributedCount,
        totalAmount: totalDistributedAmount.toFixed(6)
      };

    } catch (error) {
      logger.error('[ReferralService] Ошибка распределения реферальных наград', {
        sourceUserId,
        amount,
        sourceType,
        error: error instanceof Error ? error.message : String(error)
      });
      return { success: false, distributed: 0, totalAmount: '0' };
    }
  }
}