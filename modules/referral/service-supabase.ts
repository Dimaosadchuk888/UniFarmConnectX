/**
 * Реферальный сервис адаптированный под Supabase схему
 * Использует users.referred_by вместо отдельной таблицы referrals
 */

import { supabase } from '../../core/supabase';

export class ReferralService {

  /**
   * Генерирует уникальный реферальный код для пользователя
   */
  async generateReferralCode(userId: string): Promise<string> {
    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const refCode = `${userId.slice(-4)}${random}${timestamp.toString().slice(-4)}`;
      
      console.log('[ReferralService] Генерация реферального кода для пользователя', { userId, refCode });
      return refCode;
    } catch (error) {
      console.error('[ReferralService] Ошибка генерации реферального кода', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Обрабатывает реферальную связь между пользователями
   * Использует users.referred_by для связи
   */
  async processReferral(refCode: string, newUserId: string): Promise<{ success: boolean; error?: string; cyclicError?: boolean }> {
    try {
      // Находим пользователя с таким реферальным кодом
      const { data: inviter, error: inviterError } = await supabase
        .from('users')
        .select('id, ref_code, telegram_id')
        .eq('ref_code', refCode)
        .single();

      if (inviterError || !inviter) {
        console.warn(`[REFERRAL] Реферальный код ${refCode} не найден`, {
          refCode,
          newUserId,
          error: inviterError?.message
        });
        return { success: false, error: 'Реферальный код не найден' };
      }

      // Получаем данные нового пользователя
      const { data: newUser, error: newUserError } = await supabase
        .from('users')
        .select('id, telegram_id, referred_by')
        .eq('id', newUserId)
        .single();

      if (newUserError || !newUser) {
        console.warn(`[REFERRAL] Новый пользователь ${newUserId} не найден`, {
          refCode,
          newUserId,
          error: newUserError?.message
        });
        return { success: false, error: 'Пользователь не найден' };
      }

      // Проверка на цикл: пользователь не может ссылаться сам на себя
      if (inviter.id === newUser.id) {
        console.warn(`[REFERRAL] Пользователь пытается ссылаться сам на себя`, {
          newUserId: newUser.id,
          inviterId: inviter.id,
          refCode
        });
        return { 
          success: false, 
          error: 'Нельзя использовать собственный реферальный код', 
          cyclicError: true 
        };
      }

      // Проверяем, что пользователь еще не был приглашен
      if (newUser.referred_by) {
        console.warn(`[REFERRAL] Пользователь уже был приглашен`, {
          newUserId: newUser.id,
          existingReferrer: newUser.referred_by,
          newReferrer: refCode
        });
        return { success: false, error: 'Пользователь уже использовал реферальный код' };
      }

      // Обновляем нового пользователя, указывая реферальный код приглашающего
      const { error: updateError } = await supabase
        .from('users')
        .update({ referred_by: refCode })
        .eq('id', newUserId);

      if (updateError) {
        console.error('[REFERRAL] Ошибка обновления referred_by', {
          newUserId,
          refCode,
          error: updateError.message
        });
        return { success: false, error: 'Ошибка обработки реферальной связи' };
      }

      // Создаем транзакцию бонуса для приглашающего
      const { error: bonusError } = await supabase
        .from('transactions')
        .insert({
          user_id: inviter.id,
          type: 'REFERRAL_BONUS',
          amount_uni: 10.0,
          amount_ton: 0,
          description: `Бонус за приглашение пользователя ${newUser.telegram_id}`,
          status: 'confirmed'
        });

      if (!bonusError) {
        // Обновляем баланс приглашающего
        const { data: inviterBalance } = await supabase
          .from('users')
          .select('balance_uni')
          .eq('id', inviter.id)
          .single();

        if (inviterBalance) {
          await supabase
            .from('users')
            .update({ 
              balance_uni: (parseFloat(inviterBalance.balance_uni || '0') + 10).toString() 
            })
            .eq('id', inviter.id);
        }
      }

      console.log(`[REFERRAL] Успешно обработана реферальная связь: ${newUser.telegram_id} → ${inviter.id}`, {
        newUserId: newUser.id,
        newUserTelegramId: newUser.telegram_id,
        inviterId: inviter.id,
        refCode,
        bonusAwarded: !bonusError
      });

      return { success: true };
    } catch (error) {
      console.error('[ReferralService] Ошибка обработки реферала:', {
        refCode,
        newUserId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return { success: false, error: 'Внутренняя ошибка сервера' };
    }
  }

  /**
   * Получает статистику рефералов для пользователя
   * Использует referred_by поле для подсчета
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
        .from('users')
        .select('ref_code')
        .eq('id', userId)
        .single();

      if (userError || !user?.ref_code) {
        return { 
          totalReferrals: 0, 
          totalEarnings: "0", 
          referralCode: null, 
          recentReferrals: [] 
        };
      }

      // Получаем всех пользователей, приглашенных этим пользователем
      const { data: invitedUsers, error: invitedError } = await supabase
        .from('users')
        .select('id, username, telegram_id, created_at, balance_uni, balance_ton')
        .eq('referred_by', user.ref_code);

      if (invitedError) {
        console.error('[ReferralService] Ошибка получения приглашенных пользователей', {
          userId,
          error: invitedError.message
        });
        return { 
          totalReferrals: 0, 
          totalEarnings: "0", 
          referralCode: user.ref_code, 
          recentReferrals: [] 
        };
      }

      // Считаем общий доход от реферальных бонусов
      const { data: earnings, error: earningsError } = await supabase
        .from('transactions')
        .select('amount_uni')
        .eq('user_id', userId)
        .eq('type', 'REFERRAL_BONUS');

      const totalEarnings = earnings?.reduce((sum, tx) => sum + (tx.amount_uni || 0), 0) || 0;

      // Фильтруем недавних рефералов (последние 30 дней)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentReferrals = (invitedUsers || [])
        .filter(user => user.created_at && new Date(user.created_at) > thirtyDaysAgo)
        .slice(0, 10);

      return {
        totalReferrals: invitedUsers?.length || 0,
        totalEarnings: totalEarnings.toString(),
        referralCode: user.ref_code,
        recentReferrals
      };
    } catch (error) {
      console.error('[ReferralService] Ошибка получения статистики рефералов', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Получает рефералов пользователя по ID
   */
  async getReferralsByUserId(userId: string): Promise<any[]> {
    try {
      // Получаем реферальный код пользователя
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('ref_code')
        .eq('id', userId)
        .single();

      if (userError || !user?.ref_code) {
        return [];
      }

      // Получаем всех пользователей, приглашенных этим кодом
      const { data: invitedUsers, error: invitedError } = await supabase
        .from('users')
        .select('id, username, created_at, balance_uni, balance_ton')
        .eq('referred_by', user.ref_code);

      if (invitedError) {
        console.error('[ReferralService] Error getting referrals by user ID', { 
          error: invitedError.message 
        });
        return [];
      }

      return (invitedUsers || []).map(invitedUser => ({
        id: invitedUser.id,
        name: invitedUser.username || 'Unknown',
        username: invitedUser.username,
        joined_date: invitedUser.created_at,
        balance_uni: invitedUser.balance_uni || "0",
        balance_ton: invitedUser.balance_ton || "0",
        level: 1 // Прямой реферал
      }));
    } catch (error) {
      console.error('[ReferralService] Error getting referrals by user ID', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Проверяет валидность реферального кода
   */
  async validateReferralCode(refCode: string, newUserTelegramId?: string): Promise<{ valid: boolean; cyclicError?: boolean }> {
    try {
      if (!refCode || refCode.length < 6) {
        return { valid: false };
      }

      // Проверяем существование пользователя с таким реферальным кодом
      const { data: referrer, error } = await supabase
        .from('users')
        .select('id')
        .eq('ref_code', refCode)
        .single();

      if (error || !referrer) {
        return { valid: false };
      }

      // Если указан новый пользователь, проверяем что он не ссылается сам на себя
      if (newUserTelegramId) {
        const { data: newUser } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_id', newUserTelegramId)
          .single();

        if (newUser && newUser.id === referrer.id) {
          return { valid: false, cyclicError: true };
        }
      }

      return { valid: true };
    } catch (error) {
      console.error('[ReferralService] Ошибка валидации реферального кода', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return { valid: false };
    }
  }

  /**
   * Получить многоуровневую статистику рефералов
   * Адаптирована для работы с users.referred_by
   */
  async getReferralLevelsWithIncome(userIdentifier: string): Promise<{
    totalReferrals: number;
    referralCounts: Record<string, number>;
    levelIncome: Record<string, { uni: string; ton: string }>;
    referrals: any[];
  }> {
    try {
      // Получаем пользователя
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, ref_code')
        .eq('id', userIdentifier)
        .single();

      if (userError || !user) {
        console.log('[ReferralService] Пользователь не найден, возвращаем пустые данные', { userIdentifier });
        return {
          totalReferrals: 0,
          referralCounts: {},
          levelIncome: this.generateEmptyLevelIncome(),
          referrals: []
        };
      }

      console.log('[ReferralService] Получение статистики уровней для пользователя', { 
        userId: user.id 
      });

      // Получаем рефералов до 20 уровней глубины
      const allReferrals = await this.getReferralsRecursively(user.ref_code, 1, 20);

      // Группируем по уровням
      const referralCounts: Record<string, number> = {};
      const levelIncome: Record<string, { uni: string; ton: string }> = {};

      for (let i = 1; i <= 20; i++) {
        const levelReferrals = allReferrals.filter(ref => ref.level === i);
        referralCounts[i.toString()] = levelReferrals.length;

        // Рассчитываем доход с уровня (фиксированные проценты)
        const commissionRate = this.getCommissionRateForLevel(i);
        const levelUniIncome = levelReferrals.length * 10 * commissionRate; // 10 UNI базовый бонус
        
        levelIncome[i.toString()] = {
          uni: levelUniIncome.toFixed(3),
          ton: "0.000"
        };
      }

      return {
        totalReferrals: allReferrals.length,
        referralCounts,
        levelIncome,
        referrals: allReferrals
      };
    } catch (error) {
      console.error('[ReferralService] Ошибка получения многоуровневой статистики', {
        userIdentifier,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        totalReferrals: 0,
        referralCounts: {},
        levelIncome: this.generateEmptyLevelIncome(),
        referrals: []
      };
    }
  }

  /**
   * Рекурсивно получает рефералов до указанной глубины
   */
  private async getReferralsRecursively(refCode: string, currentLevel: number, maxLevel: number): Promise<any[]> {
    if (currentLevel > maxLevel) {
      return [];
    }

    // Получаем прямых рефералов
    const { data: directReferrals, error } = await supabase
      .from('users')
      .select('id, username, telegram_id, ref_code, created_at, balance_uni')
      .eq('referred_by', refCode);

    if (error || !directReferrals) {
      return [];
    }

    let allReferrals: any[] = [];

    // Добавляем прямых рефералов
    for (const referral of directReferrals) {
      allReferrals.push({
        id: referral.id,
        name: referral.username || 'Unknown',
        level: currentLevel,
        joined_date: referral.created_at,
        balance_uni: referral.balance_uni || "0"
      });

      // Рекурсивно получаем рефералов следующего уровня
      const subReferrals = await this.getReferralsRecursively(
        referral.ref_code, 
        currentLevel + 1, 
        maxLevel
      );
      allReferrals = allReferrals.concat(subReferrals);
    }

    return allReferrals;
  }

  /**
   * Возвращает комиссионную ставку для уровня
   */
  private getCommissionRateForLevel(level: number): number {
    if (level === 1) return 0.05; // 5%
    if (level <= 5) return 0.03;  // 3%
    if (level <= 10) return 0.02; // 2%
    if (level <= 15) return 0.01; // 1%
    return 0.005; // 0.5% для уровней 16-20
  }

  /**
   * Генерирует пустую структуру доходов по уровням
   */
  private generateEmptyLevelIncome(): Record<string, { uni: string; ton: string }> {
    const levelIncome: Record<string, { uni: string; ton: string }> = {};
    for (let i = 1; i <= 20; i++) {
      levelIncome[i.toString()] = { uni: "0.000", ton: "0.000" };
    }
    return levelIncome;
  }
}