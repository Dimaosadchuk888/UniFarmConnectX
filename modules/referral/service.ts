import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger';
import { REFERRAL_TABLES, REFERRAL_COMMISSION_RATES } from './model';

export class ReferralService {
  /**
   * Генерирует реферальный код для пользователя
   */
  async generateReferralCode(userId: number): Promise<string> {
    try {
      logger.info('[ReferralService] Генерация реферального кода', { userId });

      // Получаем данные пользователя
      const { data: user, error: userError } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .select('id, ref_code, telegram_id, username')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        logger.error('[ReferralService] Пользователь не найден', {
          userId,
          error: userError?.message
        });
        throw new Error('Пользователь не найден');
      }

      // Если у пользователя уже есть реферальный код, возвращаем его
      if (user.ref_code && user.ref_code.trim() !== '') {
        logger.info('[ReferralService] Возвращаем существующий реферальный код', {
          userId,
          refCode: user.ref_code
        });
        return user.ref_code;
      }

      // Генерируем новый уникальный реферальный код
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const newRefCode = `REF_${timestamp}_${randomSuffix}`;

      // Обновляем реферальный код в базе данных
      const { error: updateError } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .update({ ref_code: newRefCode })
        .eq('id', userId);

      if (updateError) {
        logger.error('[ReferralService] Ошибка обновления реферального кода', {
          userId,
          newRefCode,
          error: updateError.message
        });
        throw new Error('Не удалось сохранить реферальный код');
      }

      logger.info('[ReferralService] Реферальный код успешно сгенерирован', {
        userId,
        refCode: newRefCode
      });

      return newRefCode;
    } catch (error) {
      logger.error('[ReferralService] Ошибка генерации реферального кода', {
        userId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Обработка реферала - связывание нового пользователя с реферером
   */
  async processReferral(refCode: string, newUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('[ReferralService] Обработка реферала', {
        refCode,
        newUserId
      });

      // Находим пользователя по реферальному коду
      const { data: inviter, error: inviterError } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .select('id, telegram_id, username')
        .eq('ref_code', refCode)
        .single();

      if (inviterError || !inviter) {
        logger.warn('[ReferralService] Реферальный код не найден', {
          refCode,
          error: inviterError?.message
        });
        return { success: false, error: 'Недействительный реферальный код' };
      }

      // Проверяем, что пользователь не пытается пригласить сам себя
      if (inviter.id.toString() === newUserId) {
        logger.warn('[ReferralService] Попытка самоприглашения', {
          userId: newUserId,
          refCode
        });
        return { success: false, error: 'Нельзя использовать собственный реферальный код' };
      }

      // Обновляем поле referred_by у нового пользователя
      const { error: updateError } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .update({ referred_by: inviter.id })
        .eq('id', newUserId);

      if (updateError) {
        logger.error('[ReferralService] Ошибка обновления реферальной связи', {
          newUserId,
          inviterId: inviter.id,
          error: updateError.message
        });
        return { success: false, error: 'Ошибка сохранения реферальной связи' };
      }

      logger.info('[ReferralService] Реферальная связь установлена', {
        newUserId,
        inviterId: inviter.id,
        inviterTelegramId: inviter.telegram_id,
        refCode
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
   * Рассчёт реферальных комиссий для 20-уровневой системы
   * Новая схема: прямые проценты от фактического дохода
   */
  calculateReferralCommissions(
    amount: number,
    referrerChain: string[]
  ): Array<{ userId: string; level: number; percentage: number; amount: string }> {
    const commissions: Array<{ userId: string; level: number; percentage: number; amount: string }> = [];

    for (let i = 0; i < referrerChain.length && i < 20; i++) {
      const level = i + 1;
      const userId = referrerChain[i];

      // Получаем процент напрямую от фактического дохода
      const commissionRate = REFERRAL_COMMISSION_RATES[level as keyof typeof REFERRAL_COMMISSION_RATES];
      
      if (!commissionRate) {
        continue; // Пропускаем уровни без определенной ставки
      }

      const commissionAmount = amount * commissionRate;
      const percentageDisplay = commissionRate * 100; // Для отображения в %

      commissions.push({
        userId,
        level,
        percentage: percentageDisplay,
        amount: commissionAmount.toFixed(8)
      });
    }

    return commissions;
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
            percentage: commission.percentage,
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

            const { error: updateError } = await supabase
              .from(REFERRAL_TABLES.USERS)
              .update(updateData)
              .eq('id', parseInt(commission.userId));

            if (!updateError) {
              distributedCount++;
              totalDistributedAmount += parseFloat(commission.amount);

              // Записываем в referral_earnings таблицу
              await supabase
                .from('referral_earnings')
                .insert({
                  referrer_user_id: parseInt(commission.userId),
                  referred_user_id: parseInt(sourceUserId),
                  level: commission.level,
                  percentage: commission.percentage,
                  amount: parseFloat(commission.amount),
                  currency: currency,
                  source_type: sourceType,
                  created_at: new Date().toISOString()
                });

              // Создаем транзакцию REFERRAL_REWARD
              await supabase
                .from(REFERRAL_TABLES.TRANSACTIONS)
                .insert({
                  user_id: parseInt(commission.userId),
                  type: 'REFERRAL_REWARD',
                  amount_uni: currency === 'UNI' ? commission.amount : '0',
                  amount_ton: currency === 'TON' ? commission.amount : '0', 
                  status: 'completed',
                  description: `Referral L${commission.level} from User ${sourceUserId}: ${commission.amount} ${currency} (${commission.percentage}%)`,
                  source_user_id: parseInt(sourceUserId),
                  created_at: new Date().toISOString()
                });

              logger.info('[ReferralService] Реферальная награда начислена', {
                recipientId: commission.userId,
                level: commission.level,
                amount: commission.amount,
                currency,
                newBalance: newBalance.toFixed(8),
                sourceType,
                sourceUserId
              });
            } else {
              logger.error('[ReferralService] Ошибка обновления баланса', {
                recipientId: commission.userId,
                error: updateError.message
              });
            }
          } else {
            logger.warn('[ReferralService] Получатель награды не найден', {
              recipientId: commission.userId,
              error: getUserError?.message
            });
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

  /**
   * Получение статистики реферальной программы
   */
  async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    activeReferrals: number;
    totalEarned: { UNI: string; TON: string };
    monthlyEarned: { UNI: string; TON: string };
  }> {
    try {
      // Получаем общее количество рефералов
      const { data: referrals, error: referralsError } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .select('id, created_at')
        .eq('referred_by', userId);

      if (referralsError) {
        logger.error('[ReferralService] Ошибка получения рефералов', {
          userId,
          error: referralsError.message
        });
        throw referralsError;
      }

      const totalReferrals = referrals?.length || 0;
      
      // Для упрощения считаем всех рефералов активными
      // В будущем можно добавить логику проверки активности
      const activeReferrals = totalReferrals;

      // Возвращаем базовую статистику
      // В production здесь должна быть логика подсчёта заработанных средств
      return {
        totalReferrals,
        activeReferrals,
        totalEarned: { UNI: '0.00000000', TON: '0.00000000' },
        monthlyEarned: { UNI: '0.00000000', TON: '0.00000000' }
      };

    } catch (error) {
      logger.error('[ReferralService] Ошибка получения статистики рефералов', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarned: { UNI: '0.00000000', TON: '0.00000000' },
        monthlyEarned: { UNI: '0.00000000', TON: '0.00000000' }
      };
    }
  }
}