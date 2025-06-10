/**
 * Система автоматического распределения реферальных вознаграждений
 */

import { DeepReferralLogic } from './deepReferral';
import { db } from '../../../server/db';
import { users, transactions } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';

export class ReferralRewardDistribution {
  /**
   * Распределяет реферальные вознаграждения ТОЛЬКО от дохода с фарминга
   * Бизнес-модель: доход от дохода, 20 уровней (1%, 2%, 3%...20%)
   */
  static async distributeFarmingRewards(
    userId: string, 
    farmingReward: string
  ): Promise<boolean> {
    try {

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
              transaction_type: 'referral_bonus',
              currency: 'UNI',
              amount: commission.amount,
              source_user_id: parseInt(userId),
              description: `Referral bonus level ${commission.level} from farming`,
              status: 'confirmed'
            } as any);
        }
      }

      return true;
    } catch (error) {
      console.error('[ReferralRewardDistribution] Ошибка распределения наград:', error);
      return false;
    }
  }

  /**
   * УДАЛЕНО: Миссии НЕ дают реферальные бонусы
   * Согласно бизнес-модели: только доход от фарминга
   */

  /**
   * Начисляет milestone бонусы за достижение целей по рефералам
   */
  static async processMilestoneBonus(userId: string): Promise<string> {
    try {

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
          .where(and(
            eq(transactions.user_id, parseInt(userId)),
            eq(transactions.transaction_type, 'milestone_bonus'),
            eq(transactions.amount, milestoneBonus)
          ));

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
              transaction_type: 'milestone_bonus',
              currency: 'UNI',
              amount: milestoneBonus,
              description: `Milestone bonus for ${referralCount} referrals`,
              status: 'confirmed'
            } as any);

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