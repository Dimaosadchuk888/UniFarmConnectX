/**
 * Система автоматического распределения реферальных вознаграждений
 */

import { DeepReferralLogic } from './deepReferral';

export class ReferralRewardDistribution {
  /**
   * Распределяет реферальные вознаграждения при farming операции
   */
  static async distributeFarmingRewards(
    userId: string, 
    farmingReward: string
  ): Promise<boolean> {
    try {
      const { db } = await import('../../server/db');
      const { users, transactions } = await import('../../shared/schema');
      const { eq } = await import('drizzle-orm');

      // Получаем цепочку рефереров
      const referrerChain = await DeepReferralLogic.buildReferrerChain(userId);
      
      if (referrerChain.length === 0) {
        return true; // Нет рефереров, но это не ошибка
      }

      // Рассчитываем комиссии для каждого уровня
      const commissions = DeepReferralLogic.calculateReferralCommissions(
        farmingReward, 
        referrerChain
      );

      // Начисляем вознаграждения каждому рефереру
      for (const commission of commissions) {
        const [referrer] = await db
          .select()
          .from(users)
          .where(eq(users.id, parseInt(commission.userId)))
          .limit(1);

        if (referrer) {
          // Обновляем баланс реферера
          const newBalance = String(
            parseFloat(referrer.balance_uni || "0") + parseFloat(commission.amount)
          );

          await db
            .update(users)
            .set({ balance_uni: newBalance })
            .where(eq(users.id, parseInt(commission.userId)));

          // Записываем транзакцию о начислении реферального бонуса
          await db
            .insert(transactions)
            .values({
              user_id: parseInt(commission.userId),
              type: 'referral_bonus',
              currency: 'UNI',
              amount: commission.amount,
              source_user_id: parseInt(userId),
              description: `Referral bonus level ${commission.level} from farming`,
              status: 'confirmed'
            });
        }
      }

      return true;
    } catch (error) {
      console.error('[ReferralRewardDistribution] Ошибка распределения наград:', error);
      return false;
    }
  }

  /**
   * Распределяет бонусы при завершении миссий
   */
  static async distributeMissionRewards(
    userId: string,
    missionReward: string
  ): Promise<boolean> {
    try {
      const referrerChain = await DeepReferralLogic.buildReferrerChain(userId);
      
      if (referrerChain.length === 0) {
        return true;
      }

      // Для миссий используем уменьшенные коэффициенты (50% от farming)
      const adjustedReward = String(parseFloat(missionReward) * 0.5);
      
      return await this.distributeFarmingRewards(userId, adjustedReward);
    } catch (error) {
      console.error('[ReferralRewardDistribution] Ошибка распределения mission наград:', error);
      return false;
    }
  }

  /**
   * Начисляет milestone бонусы за достижение целей по рефералам
   */
  static async processMilestoneBonus(userId: string): Promise<string> {
    try {
      const { db } = await import('../../server/db');
      const { users, transactions } = await import('../../shared/schema');
      const { eq } = await import('drizzle-orm');

      // Получаем пользователя и его реферальный код
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (!user || !user.ref_code) {
        return "0";
      }

      // Считаем количество приглашенных пользователей
      const invitedUsers = await db
        .select()
        .from(users)
        .where(eq(users.parent_ref_code, user.ref_code));

      const referralCount = invitedUsers.length;
      
      // Рассчитываем milestone бонус
      const milestoneBonus = DeepReferralLogic.calculateMilestoneBonus(referralCount);
      
      if (parseFloat(milestoneBonus) > 0) {
        // Проверяем, не получал ли пользователь уже этот milestone
        const existingMilestone = await db
          .select()
          .from(transactions)
          .where(eq(transactions.user_id, parseInt(userId)))
          .where(eq(transactions.type, 'milestone_bonus'))
          .where(eq(transactions.amount, milestoneBonus));

        if (existingMilestone.length === 0) {
          // Начисляем milestone бонус
          const newBalance = String(
            parseFloat(user.balance_uni || "0") + parseFloat(milestoneBonus)
          );

          await db
            .update(users)
            .set({ balance_uni: newBalance })
            .where(eq(users.id, parseInt(userId)));

          // Записываем транзакцию
          await db
            .insert(transactions)
            .values({
              user_id: parseInt(userId),
              type: 'milestone_bonus',
              currency: 'UNI',
              amount: milestoneBonus,
              description: `Milestone bonus for ${referralCount} referrals`,
              status: 'confirmed'
            });

          return milestoneBonus;
        }
      }

      return "0";
    } catch (error) {
      console.error('[ReferralRewardDistribution] Ошибка milestone бонуса:', error);
      return "0";
    }
  }
}