import { db } from '../db';
import { referrals, Referral, InsertReferral } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Сервис для работы с реферальной системой
 */
export class ReferralService {
  /**
   * Получает все реферальные связи пользователя
   * @param userId ID пользователя
   * @returns Массив реферальных связей (пустой массив, если рефералов нет)
   */
  static async getUserReferrals(userId: number): Promise<Referral[]> {
    try {
      if (!userId || typeof userId !== 'number' || userId <= 0) {
        console.log('[ReferralService] Invalid userId:', userId);
        return []; // Возвращаем пустой массив при некорректном userId
      }
      
      const userReferrals = await db
        .select()
        .from(referrals)
        .where(eq(referrals.inviter_id, userId))
        .orderBy(referrals.created_at);
      
      // Гарантируем, что всегда возвращаем массив, даже если запрос вернул null или undefined
      return userReferrals || [];
    } catch (error) {
      console.error('[ReferralService] Error in getUserReferrals:', error);
      return []; // В случае ошибки также возвращаем пустой массив
    }
  }

  /**
   * Создает новую реферальную связь
   * @param referralData Данные реферальной связи
   * @returns Созданная реферальная связь
   */
  static async createReferral(referralData: InsertReferral): Promise<Referral> {
    const [referral] = await db
      .insert(referrals)
      .values(referralData)
      .returning();
    
    return referral;
  }

  /**
   * Проверяет, есть ли у пользователя пригласитель
   * @param userId ID пользователя
   * @returns Реферальная связь или undefined, если пригласителя нет
   */
  static async getUserInviter(userId: number): Promise<Referral | undefined> {
    const [referral] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.user_id, userId));
    
    return referral;
  }

  /**
   * Получает количество рефералов пользователя по уровням
   * @param userId ID пользователя
   * @returns Объект с количеством рефералов по уровням (пустой объект, если нет рефералов)
   */
  static async getReferralCounts(userId: number): Promise<Record<number, number>> {
    try {
      if (!userId || typeof userId !== 'number' || userId <= 0) {
        console.log('[ReferralService] Invalid userId in getReferralCounts:', userId);
        return {}; // Возвращаем пустой объект при некорректном userId
      }
      
      const referralsCounts = await db
        .select({
          level: referrals.level,
          count: sql<string>`count(${referrals.id})`
        })
        .from(referrals)
        .where(eq(referrals.inviter_id, userId))
        .groupBy(referrals.level);
      
      // Преобразуем результат в объект { level: count }
      const result: Record<number, number> = {};
      for (const { level, count } of referralsCounts) {
        if (level !== null) {
          result[level] = Number(count);
        }
      }
      
      return result;
    } catch (error) {
      console.error('[ReferralService] Error in getReferralCounts:', error);
      return {}; // В случае ошибки возвращаем пустой объект
    }
  }
}