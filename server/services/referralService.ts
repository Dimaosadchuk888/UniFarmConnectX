import { db } from '../db';
import { referrals, Referral, InsertReferral } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Сервис для работы с реферальной системой
 */
export class ReferralService {
  /**
   * Получает все реферальные связи пользователя
   * @param userId ID пользователя
   * @returns Массив реферальных связей
   */
  static async getUserReferrals(userId: number): Promise<Referral[]> {
    const userReferrals = await db
      .select()
      .from(referrals)
      .where(eq(referrals.inviter_id, userId))
      .orderBy(referrals.created_at);
    
    return userReferrals;
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
   * @returns Объект с количеством рефералов по уровням
   */
  static async getReferralCounts(userId: number): Promise<Record<number, number>> {
    const referrals = await db
      .select({
        level: referrals.level,
        count: db.fn.count<number>(referrals.id)
      })
      .from(referrals)
      .where(eq(referrals.inviter_id, userId))
      .groupBy(referrals.level);
    
    // Преобразуем результат в объект { level: count }
    const result: Record<number, number> = {};
    for (const { level, count } of referrals) {
      if (level !== null) {
        result[level] = Number(count);
      }
    }
    
    return result;
  }
}