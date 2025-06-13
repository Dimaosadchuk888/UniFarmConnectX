/**
 * Система автоматического распределения реферальных вознаграждений
 */

import { DeepReferralLogic } from './deepReferral';
import { db } from '../../../core/db.js';
import { users, transactions } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../../core/logger.js';

export class ReferralRewardDistribution {
  /**
   * Распределяет реферальные вознаграждения ТОЛЬКО от дохода с фарминга
   * Бизнес-модель: доход от дохода, 20 уровней (1%, 2%, 3%...20%)
   * 
   * ⭐ ТРАНЗАКЦИОННАЯ ВЕРСИЯ: Все начисления происходят атомарно
   * Если хотя бы одно начисление не прошло - вся операция откатывается
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

      if (commissions.length === 0) {
        return true; // Нет комиссий для начисления
      }

      // ⭐ ТРАНЗАКЦИОННОЕ НАЧИСЛЕНИЕ ВСЕХ РЕФЕРАЛЬНЫХ ВОЗНАГРАЖДЕНИЙ
      // Все операции выполняются атомарно - либо все, либо ничего
      const success = await db.transaction(async (tx) => {
        const timestamp = new Date().toISOString();
        const processedCommissions: Array<{
          userId: string;
          amount: string;
          level: number;
          previousBalance: string;
          newBalance: string;
        }> = [];

        // Обрабатываем все комиссии в рамках одной транзакции
        for (const commission of commissions) {
          // Получаем данные реферера в рамках транзакции
          const [referrer] = await tx
            .select()
            .from(users)
            .where(eq(users.id, parseInt(commission.userId)))
            .limit(1);

          if (!referrer) {
            logger.warn(`[REFERRAL] Referrer ${commission.userId} not found, skipping level ${commission.level}`, {
              referrerId: commission.userId,
              sourceUserId: userId,
              level: commission.level,
              amount: commission.amount,
              timestamp
            });
            continue; // Пропускаем, но не прерываем транзакцию
          }

          const previousBalance = parseFloat(referrer.balance_uni || "0");
          const newBalance = (previousBalance + parseFloat(commission.amount)).toFixed(8);

          // Обновляем баланс реферера в рамках транзакции
          await tx
            .update(users)
            .set({ balance_uni: newBalance })
            .where(eq(users.id, parseInt(commission.userId)));

          // Записываем транзакцию о начислении в рамках общей транзакции
          await tx
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

          // Сохраняем данные для логирования
          processedCommissions.push({
            userId: commission.userId,
            amount: commission.amount,
            level: commission.level,
            previousBalance: previousBalance.toFixed(8),
            newBalance
          });
        }

        // Логируем все успешные начисления после commit транзакции
        for (const processed of processedCommissions) {
          logger.info(`[REFERRAL] User ${processed.userId} earned ${processed.amount} UNI from referral level ${processed.level} at ${timestamp}`, {
            referrerId: processed.userId,
            sourceUserId: userId,
            amount: processed.amount,
            currency: 'UNI',
            level: processed.level,
            commissionRate: `${processed.level}%`,
            previousBalance: processed.previousBalance,
            newBalance: processed.newBalance,
            sourceType: 'farming_reward',
            operation: 'referral_bonus',
            timestamp,
            transactional: true
          });

          logger.debug(`[REFERRAL] Transaction recorded for referral bonus`, {
            referrerId: processed.userId,
            sourceUserId: userId,
            transactionType: 'referral_bonus',
            amount: processed.amount,
            level: processed.level,
            timestamp,
            transactional: true
          });
        }

        logger.info(`[REFERRAL] Transactional referral distribution completed for user ${userId}`, {
          sourceUserId: userId,
          totalCommissions: processedCommissions.length,
          totalLevels: commissions.length,
          farmingReward,
          timestamp,
          transactional: true
        });

        return true;
      });

      return success;
    } catch (error) {
      logger.error('[ReferralRewardDistribution] Транзакционная ошибка распределения наград:', {
        userId,
        farmingReward,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        transactional: true
      });
      
      logger.error('[ReferralRewardDistribution] Ошибка распределения наград', { error: error instanceof Error ? error.message : String(error) });
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
          const previousBalance = parseFloat(user.balance_uni || "0");
          const newBalance = (previousBalance + parseFloat(milestoneBonus)).toFixed(8);
          const timestamp = new Date().toISOString();

          // Начисляем milestone бонус
          await db
            .update(users)
            .set({ balance_uni: newBalance })
            .where(eq(users.id, parseInt(userId)));

          // ОСНОВНОЕ ЛОГИРОВАНИЕ ДОХОДНОЙ ОПЕРАЦИИ MILESTONE БОНУСА
          logger.info(`[MILESTONE] User ${userId} earned ${milestoneBonus} UNI milestone bonus for ${referralCount} referrals at ${timestamp}`, {
            userId,
            amount: milestoneBonus,
            currency: 'UNI',
            referralCount,
            previousBalance: previousBalance.toFixed(8),
            newBalance,
            milestoneType: `${referralCount}_referrals`,
            operation: 'milestone_bonus',
            timestamp
          });

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

          logger.debug(`[MILESTONE] Transaction recorded for milestone bonus`, {
            userId,
            transactionType: 'milestone_bonus',
            amount: milestoneBonus,
            referralCount,
            timestamp
          });

          return milestoneBonus;
        }
      }

      return "0";
    } catch (error) {
      logger.error('[ReferralRewardDistribution] Ошибка milestone бонуса', { error: error instanceof Error ? error.message : String(error) });
      return "0";
    }
  }
}