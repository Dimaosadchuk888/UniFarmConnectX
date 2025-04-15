import { db } from '../db';
import { missions, userMissions, users, transactions, Mission, UserMission } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Сервис для работы с миссиями
 */
export class MissionService {
  /**
   * Получает все активные миссии
   * @returns Массив активных миссий
   */
  static async getActiveMissions(): Promise<Mission[]> {
    const activeMissions = await db
      .select()
      .from(missions)
      .where(eq(missions.is_active, true));
    
    return activeMissions;
  }

  /**
   * Получает все выполненные миссии пользователя
   * @param userId ID пользователя
   * @returns Массив выполненных миссий
   */
  static async getUserCompletedMissions(userId: number): Promise<UserMission[]> {
    const userCompletedMissions = await db
      .select()
      .from(userMissions)
      .where(eq(userMissions.user_id, userId));
    
    return userCompletedMissions;
  }

  /**
   * Проверяет, выполнил ли пользователь конкретную миссию
   * @param userId ID пользователя
   * @param missionId ID миссии
   * @returns true если миссия выполнена, иначе false
   */
  static async isUserMissionCompleted(userId: number, missionId: number): Promise<boolean> {
    const [existingMission] = await db
      .select()
      .from(userMissions)
      .where(and(
        eq(userMissions.user_id, userId),
        eq(userMissions.mission_id, missionId)
      ));
    
    return !!existingMission;
  }

  /**
   * Завершает миссию для пользователя и начисляет награду
   * @param userId ID пользователя
   * @param missionId ID миссии
   * @returns Объект с результатом операции
   */
  static async completeMission(userId: number, missionId: number): Promise<{ success: boolean; message: string; reward?: number }> {
    // Начинаем транзакцию БД
    try {
      // Проверяем, что миссия существует и активна
      const [mission] = await db
        .select()
        .from(missions)
        .where(and(
          eq(missions.id, missionId),
          eq(missions.is_active, true)
        ));
      
      if (!mission) {
        return { success: false, message: "Mission not found or inactive" };
      }
      
      // Проверяем, что пользователь существует
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
      
      if (!user) {
        return { success: false, message: "User not found" };
      }
      
      // Проверяем, что пользователь еще не выполнял эту миссию
      const isCompleted = await this.isUserMissionCompleted(userId, missionId);
      
      if (isCompleted) {
        return { success: false, message: "Mission already completed by this user" };
      }
      
      // Создаем запись о выполнении миссии
      await db.insert(userMissions).values({
        user_id: userId,
        mission_id: missionId,
        completed_at: new Date()
      });
      
      // Получаем награду за миссию
      const rewardUni = mission.reward_uni;
      const reward = rewardUni ? parseFloat(rewardUni) : 0;
      
      // Обновляем баланс пользователя
      await db
        .update(users)
        .set({ 
          balance_uni: sql`${users.balance_uni} + ${reward.toString()}`
        })
        .where(eq(users.id, userId));
      
      // Создаем запись о транзакции награды
      await db.insert(transactions).values({
        user_id: userId,
        type: "reward",
        currency: "UNI",
        amount: reward.toString(),
        status: "confirmed"
      });
      
      return {
        success: true,
        message: `Mission completed. ${reward} UNI added to balance.`,
        reward
      };
    } catch (error) {
      console.error("Error completing mission:", error);
      return { success: false, message: "Failed to complete mission" };
    }
  }
}