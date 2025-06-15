import { supabase } from '../../core/supabase';
import { missions, userMissions, users, transactions } from '../../shared/schema.js';
import { eq, and, notInArray } from 'drizzle-orm';
import { UserRepository } from '../../core/repositories/UserRepository';
import { logger } from '../../core/logger.js';

export class MissionsService {
  async getActiveMissionsByTelegramId(telegramId: string): Promise<any[]> {
    try {
      const user = await UserRepository.findByTelegramId(telegramId);
      if (!user) {
        return [];
      }

      // Получаем завершенные миссии пользователя
      const completedMissions = await db
        .select({ mission_id: userMissions.mission_id })
        .from(userMissions)
        .where(eq(userMissions.user_id, user.id));

      const completedMissionIds = completedMissions.map(m => m.mission_id);

      // Получаем активные миссии с информацией о выполнении
      let activeMissions = await db
        .select()
        .from(missions)
        .where(eq(missions.is_active, true));

      // Добавляем информацию о выполнении
      return activeMissions.map(mission => ({
        id: mission.id,
        title: mission.title,
        description: mission.description,
        reward: parseFloat(mission.reward_uni || "0"),
        type: mission.type,
        completed: completedMissionIds.includes(mission.id),
        completed_at: null // Можно добавить если нужно
      }));
    } catch (error) {
      logger.error('[MissionsService] Ошибка получения активных миссий', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  async getAvailableMissions(userId: string): Promise<any[]> {
    try {
      // Получаем завершенные миссии пользователя
      const completedMissions = await db
        .select({ mission_id: userMissions.mission_id })
        .from(userMissions)
        .where(eq(userMissions.user_id, parseInt(userId)));

      const completedMissionIds = completedMissions.map(m => m.mission_id);

      // Получаем доступные миссии (активные и не завершенные)
      let availableMissions;
      
      if (completedMissionIds.length > 0) {
        const validMissionIds = completedMissionIds.filter(id => id !== null);
        if (validMissionIds.length > 0) {
          availableMissions = await db
            .select()
            .from(missions)
            .where(and(
              eq(missions.is_active, true),
              notInArray(missions.id, validMissionIds)
            ));
        } else {
          availableMissions = await db
            .select()
            .from(missions)
            .where(eq(missions.is_active, true));
        }
      } else {
        availableMissions = await db
          .select()
          .from(missions)
          .where(eq(missions.is_active, true));
      }
      return availableMissions;
    } catch (error) {
      logger.error('[MissionsService] Ошибка получения миссий', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  async completeMission(userId: string, missionId: string): Promise<boolean> {
    try {
      // Проверяем, не завершена ли уже миссия
      const [existingCompletion] = await db
        .select()
        .from(userMissions)
        .where(and(
          eq(userMissions.user_id, parseInt(userId)),
          eq(userMissions.mission_id, parseInt(missionId))
        ))
        .limit(1);

      if (existingCompletion) return false;

      // Записываем завершение миссии
      await db
        .insert(userMissions)
        .values({
          user_id: parseInt(userId),
          mission_id: parseInt(missionId),
          completed_at: new Date()
        });

      return true;
    } catch (error) {
      logger.error('[MissionsService] Ошибка завершения миссии', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  async claimMissionReward(userId: string, missionId: string): Promise<{ amount: string; claimed: boolean }> {
    try {
      const timestamp = new Date().toISOString();

      // Проверяем, завершена ли миссия
      const [completion] = await db
        .select()
        .from(userMissions)
        .where(and(
          eq(userMissions.user_id, parseInt(userId)),
          eq(userMissions.mission_id, parseInt(missionId))
        ))
        .limit(1);

      if (!completion) {
        logger.warn(`[MISSION] Reward claim rejected for user ${userId}: mission ${missionId} not completed`, {
          userId,
          missionId,
          reason: 'mission_not_completed',
          timestamp
        });
        return { amount: "0", claimed: false };
      }

      // Получаем информацию о миссии
      const [mission] = await db
        .select()
        .from(missions)
        .where(eq(missions.id, parseInt(missionId)))
        .limit(1);

      if (!mission || !mission.reward_uni) {
        logger.warn(`[MISSION] Reward claim rejected for user ${userId}: mission ${missionId} has no reward`, {
          userId,
          missionId,
          reason: 'no_reward_available',
          timestamp
        });
        return { amount: "0", claimed: false };
      }

      const rewardAmount = mission.reward_uni;
      if (parseFloat(rewardAmount) <= 0) {
        logger.warn(`[MISSION] Reward claim rejected for user ${userId}: invalid reward amount ${rewardAmount}`, {
          userId,
          missionId,
          amount: rewardAmount,
          reason: 'invalid_reward_amount',
          timestamp
        });
        return { amount: "0", claimed: false };
      }

      // Начисляем награду пользователю
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (!user) {
        logger.error(`[MISSION] User ${userId} not found for mission reward`, {
          userId,
          missionId,
          timestamp
        });
        return { amount: "0", claimed: false };
      }

      const previousBalance = parseFloat(user.balance_uni || "0");
      const newBalance = (previousBalance + parseFloat(rewardAmount)).toFixed(8);
      
      await db
        .update(users)
        .set({ balance_uni: newBalance })
        .where(eq(users.id, parseInt(userId)));

      // ОСНОВНОЕ ЛОГИРОВАНИЕ ДОХОДНОЙ ОПЕРАЦИИ МИССИИ
      logger.info(`[MISSION] User ${userId} earned ${rewardAmount} UNI from mission at ${timestamp}`, {
        userId,
        missionId,
        amount: rewardAmount,
        currency: 'UNI',
        previousBalance: previousBalance.toFixed(8),
        newBalance,
        missionTitle: mission.title,
        missionType: mission.type,
        completedAt: completion.completed_at?.toISOString(),
        operation: 'mission_reward',
        timestamp
      });

      // Записываем транзакцию
      await db
        .insert(transactions)
        .values({
          user_id: parseInt(userId),
          transaction_type: 'mission_reward',
          currency: 'UNI',
          amount: rewardAmount,
          description: `Mission reward: ${mission.title}`,
          status: 'confirmed'
        } as any);

      logger.debug(`[MISSION] Reward transaction recorded for user ${userId}`, {
        userId,
        missionId,
        transactionType: 'mission_reward',
        amount: rewardAmount,
        timestamp
      });

      return { amount: rewardAmount, claimed: true };
    } catch (error) {
      logger.error(`[MISSION] Critical error during reward claim for user ${userId}`, {
        userId,
        missionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      return { amount: "0", claimed: false };
    }
  }

  async getUserMissionProgress(userId: string): Promise<any[]> {
    try {
      const completedMissions = await db
        .select({
          mission_id: userMissions.mission_id,
          completed_at: userMissions.completed_at,
          title: missions.title,
          description: missions.description,
          reward_uni: missions.reward_uni
        })
        .from(userMissions)
        .leftJoin(missions, eq(userMissions.mission_id, missions.id))
        .where(eq(userMissions.user_id, parseInt(userId)));

      return completedMissions;
    } catch (error) {
      logger.error('[MissionsService] Ошибка получения прогресса', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  async getMissionStatsByTelegramId(telegramId: string): Promise<any> {
    try {
      const user = await UserRepository.findByTelegramId(telegramId);
      if (!user) {
        return {
          total_missions: 0,
          completed_missions: 0,
          pending_missions: 0,
          total_rewards: '0',
          completion_rate: 0
        };
      }

      // Получаем общее количество активных миссий
      const totalMissions = await db
        .select({ count: missions.id })
        .from(missions)
        .where(eq(missions.is_active, true));

      // Получаем завершенные миссии пользователя
      const completedMissions = await db
        .select({ mission_id: userMissions.mission_id })
        .from(userMissions)
        .where(eq(userMissions.user_id, user.id));

      // Считаем общую сумму наград
      const totalRewards = await db
        .select({
          total: missions.reward_uni
        })
        .from(userMissions)
        .leftJoin(missions, eq(userMissions.mission_id, missions.id))
        .where(eq(userMissions.user_id, user.id));

      const totalMissionsCount = totalMissions.length;
      const completedCount = completedMissions.length;
      const pendingCount = totalMissionsCount - completedCount;
      const completionRate = totalMissionsCount > 0 ? (completedCount / totalMissionsCount) * 100 : 0;

      const totalRewardSum = totalRewards.reduce((sum, reward) => {
        return sum + parseFloat(reward.total || '0');
      }, 0);

      return {
        total_missions: totalMissionsCount,
        completed_missions: completedCount,
        pending_missions: pendingCount,
        total_rewards: totalRewardSum.toFixed(8),
        completion_rate: Math.round(completionRate)
      };
    } catch (error) {
      logger.error('[MissionsService] Ошибка получения статистики', { error: error instanceof Error ? error.message : String(error) });
      return {
        total_missions: 0,
        completed_missions: 0,
        pending_missions: 0,
        total_rewards: '0',
        completion_rate: 0
      };
    }
  }

  async getUserMissionsByTelegramId(telegramId: string): Promise<any[]> {
    try {
      const user = await UserRepository.findByTelegramId(telegramId);
      if (!user) {
        return [];
      }

      // Получаем все миссии пользователя с информацией о завершении
      const userMissionsData = await db
        .select({
          mission_id: missions.id,
          title: missions.title,
          description: missions.description,
          reward_uni: missions.reward_uni,
          type: missions.type,
          is_active: missions.is_active,
          completed_at: userMissions.completed_at
        })
        .from(missions)
        .leftJoin(userMissions, and(
          eq(userMissions.mission_id, missions.id),
          eq(userMissions.user_id, user.id)
        ))
        .where(eq(missions.is_active, true));

      return userMissionsData.map(mission => ({
        id: mission.mission_id,
        title: mission.title,
        description: mission.description,
        reward: parseFloat(mission.reward_uni || '0'),
        type: mission.type,
        completed: !!mission.completed_at,
        completed_at: mission.completed_at
      }));
    } catch (error) {
      logger.error('[MissionsService] Ошибка получения миссий пользователя', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }
}