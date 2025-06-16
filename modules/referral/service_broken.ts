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
      const { data: user, error: userError } = // Логируем реферальное начисление (транзакции создаются отдельно)
      logger.info('[ReferralService] Реферальное начисление', {
        referrerId: referrer.id,
        level,
        reward: reward.toFixed(8),
        currency: 'UNI',
        fromUserId: userId
      });
      throw error;
    }
  }

  /**
   * Получает рефералов пользователя через Supabase API
   */
  async getReferralsByUserId(userId: string): Promise<any[]> {
    try {
      // Получаем реферальный код пользователя
      const { data: user, error: userError } = // Логируем реферальное начисление (транзакции создаются отдельно)
      logger.info('[ReferralService] Реферальное начисление', {
        referrerId: referrer.id,
        level,
        reward: reward.toFixed(8),
        currency: 'UNI',
        fromUserId: userId
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
          .eq('id', currentUserId)
          .single();

        if (error || !user) {
          logger.warn('[ReferralService] Пользователь не найден или ошибка запроса', {
            currentUserId,
            level,
            error: error?.message
          });
          break;
        }

        // Если нет реферера, завершаем цепочку
        if (!user.referred_by) {
          break;
        }

        // Добавляем реферера в цепочку
        referrerChain.push(user.referred_by.toString());
        currentUserId = user.referred_by.toString();
        level++;
      }

      logger.info('[ReferralService] Построена цепочка рефереров', {
        userId,
        chainLength: referrerChain.length,
        maxDepth: level
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
   * Распределение реферальных наград через Supabase API
   */
  async distributeReferralRewards(
    sourceUserId: string,
    amount: string,
    currency: 'UNI' | 'TON',
    sourceType: 'farming' | 'boost' = 'farming'
  ): Promise<{ success: boolean; distributed: number; totalAmount: string }> {
    try {
      logger.info('[ReferralService] Начало распределения реферальных наград', {
        sourceUserId,
        amount,
        currency,
        sourceType
      });

      // Получаем цепочку рефереров
      const referrerChain = await this.buildReferrerChain(sourceUserId);
      
      if (referrerChain.length === 0) {
        logger.info('[ReferralService] Цепочка рефереров пуста', { sourceUserId });
        return { success: true, distributed: 0, totalAmount: '0' };
      }

      // Рассчитываем комиссии
      const commissions = this.calculateReferralCommissions(parseFloat(amount), referrerChain);
      
      let distributedCount = 0;
      let totalDistributedAmount = 0;

      // Распределяем награды
      for (const commission of commissions) {
        try {
          // Логируем реферальное начисление (без создания транзакций)
          logger.info('[ReferralService] Реферальное начисление', {
            recipientId: commission.userId,
            level: commission.level,
            amount: commission.amount,
            currency,
            sourceType,
            sourceUserId
          });

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