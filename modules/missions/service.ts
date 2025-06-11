import { db } from '../../server/db.js';
import { missions, userMissions, users } from '../../shared/schema.js';
import { eq, and, notInArray } from 'drizzle-orm';
import { UserRepository } from '../../core/repositories/UserRepository';

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
      console.error('[MissionsService] Ошибка получения активных миссий:', error);
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
        availableMissions = await db
          .select()
          .from(missions)
          .where(and(
            eq(missions.is_active, true),
            notInArray(missions.id, completedMissionIds)
          ));
      } else {
        availableMissions = await db
          .select()
          .from(missions)
          .where(eq(missions.is_active, true));
      }
      return availableMissions;
    } catch (error) {
      console.error('[MissionsService] Ошибка получения миссий:', error);
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
      console.error('[MissionsService] Ошибка завершения миссии:', error);
      return false;
    }
  }

  async claimMissionReward(userId: string, missionId: string): Promise<{ amount: string; claimed: boolean }> {
    try {
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
        return { amount: "0", claimed: false };
      }

      // Получаем информацию о миссии
      const [mission] = await db
        .select()
        .from(missions)
        .where(eq(missions.id, parseInt(missionId)))
        .limit(1);

      if (!mission || !mission.reward_uni) {
        return { amount: "0", claimed: false };
      }

      // Начисляем награду пользователю
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (user) {
        const newBalance = String(parseFloat(user.balance_uni || "0") + parseFloat(mission.reward_uni));
        
        await db
          .update(users)
          .set({ balance_uni: newBalance })
          .where(eq(users.id, parseInt(userId)));

        // Миссии НЕ дают реферальные бонусы согласно бизнес-модели
      }

      return { amount: mission.reward_uni, claimed: true };
    } catch (error) {
      console.error('[MissionsService] Ошибка получения награды:', error);
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
      console.error('[MissionsService] Ошибка получения прогресса:', error);
      return [];
    }
  }
}