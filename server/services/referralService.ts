import { db } from '../db';
import { referrals, Referral, InsertReferral } from '@shared/schema';
import { eq, sql, and } from 'drizzle-orm';
import { UserService } from './userService';

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
  
  /**
   * Обрабатывает параметр startParam из Telegram WebApp
   * Проверяет, что startParam соответствует ref_code существующего пользователя
   * 
   * @param startParam Параметр из Telegram WebApp.startParam
   * @returns ID пригласителя или null, если пригласитель не найден
   */
  static async processStartParam(startParam: string | null | undefined): Promise<{ inviterId: number | null, refCode: string | null }> {
    if (!startParam) {
      console.log('[ReferralService] No startParam provided');
      return { inviterId: null, refCode: null };
    }
    
    console.log(`[ReferralService] Processing startParam: ${startParam}`);
    
    // Регулярное выражение для проверки формата ref_XXXX
    const refPattern = /^ref_([a-zA-Z0-9]+)$/;
    const match = String(startParam).match(refPattern);
    
    if (!match) {
      // Если startParam не соответствует формату ref_XXXX, проверяем просто как ref_code
      if (/^[a-zA-Z0-9]{6,12}$/.test(startParam)) {
        console.log(`[ReferralService] Processing startParam as direct ref_code: ${startParam}`);
        
        try {
          const inviterUser = await UserService.getUserByRefCode(startParam);
          
          if (inviterUser) {
            console.log(`[ReferralService] Found inviter by direct ref_code: ${startParam}, userId: ${inviterUser.id}`);
            return { inviterId: inviterUser.id, refCode: startParam };
          }
        } catch (error) {
          console.error(`[ReferralService] Error looking up user by direct ref_code:`, error);
        }
      }
      
      console.warn(`[ReferralService] Invalid startParam format: ${startParam}`);
      return { inviterId: null, refCode: null };
    }
    
    const refCode = match[1];
    console.log(`[ReferralService] Extracted refCode from startParam: ${refCode}`);
    
    try {
      // Ищем пользователя с таким ref_code
      const inviterUser = await UserService.getUserByRefCode(refCode);
      
      if (!inviterUser) {
        console.warn(`[ReferralService] No user found with ref_code: ${refCode}`);
        return { inviterId: null, refCode };
      }
      
      console.log(`[ReferralService] Found inviter by ref_code: ${refCode}, userId: ${inviterUser.id}`);
      return { inviterId: inviterUser.id, refCode };
    } catch (error) {
      console.error(`[ReferralService] Error processing refCode ${refCode}:`, error);
      return { inviterId: null, refCode };
    }
  }
  
  /**
   * Создает реферальную связь между пользователями
   * 
   * @param userId ID нового пользователя
   * @param inviterId ID пригласившего пользователя
   * @param level Уровень реферальной связи (по умолчанию 1)
   * @returns Объект с информацией о реферальной связи и статусе операции
   */
  static async createReferralRelationship(
    userId: number, 
    inviterId: number, 
    level: number = 1
  ): Promise<{
    referral: Referral | null;
    success: boolean;
    isNewConnection: boolean;
    message: string;
  }> {
    if (!userId || !inviterId) {
      console.error(`[ReferralService] Invalid userId (${userId}) or inviterId (${inviterId})`);
      return {
        referral: null,
        success: false,
        isNewConnection: false,
        message: 'Недопустимый ID пользователя или пригласителя'
      };
    }
    
    if (userId === inviterId) {
      console.error(`[ReferralService] Cannot create self-referral: userId ${userId} equals inviterId ${inviterId}`);
      return {
        referral: null,
        success: false,
        isNewConnection: false,
        message: 'Невозможно создать реферальную связь с самим собой'
      };
    }
    
    try {
      // Проверяем, существует ли уже связь для этого пользователя
      const existingReferral = await this.getUserInviter(userId);
      
      if (existingReferral) {
        // Важно! Реализация задания из ТЗ (Этап 3.1)
        // При повторной попытке привязки возвращаем существующую связь, но флаг isNewConnection = false
        console.warn(`[referral] Ref_code ignored, user ${userId} already bound to inviter ${existingReferral.inviter_id}`);
        
        const sameInviter = existingReferral.inviter_id === inviterId;
        const logMessage = sameInviter
          ? `[referral] Попытка повторной привязки к тому же пригласителю: ${inviterId}`
          : `[referral] Отмена: пользователь ${userId} уже привязан к другому пригласителю: ${existingReferral.inviter_id}`;
        
        console.log(logMessage);
        
        return {
          referral: existingReferral,
          success: true,
          isNewConnection: false,
          message: 'Пользователь уже привязан к пригласителю'
        };
      }
      
      // Создаем новую реферальную связь
      console.log(`[ReferralService] Creating referral relationship: user ${userId} invited by ${inviterId} at level ${level}`);
      
      const referralData: InsertReferral = {
        user_id: userId,
        inviter_id: inviterId,
        level,
        created_at: new Date()
      };
      
      const referral = await this.createReferral(referralData);
      console.log(`[referral] Привязка успешно: user ${userId} → inviter ${inviterId}`);
      
      return {
        referral,
        success: true,
        isNewConnection: true,
        message: 'Реферальная связь успешно создана'
      };
    } catch (error) {
      console.error(`[ReferralService] Error creating referral relationship: `, error);
      return {
        referral: null,
        success: false,
        isNewConnection: false,
        message: `Ошибка при создании реферальной связи: ${error}`
      };
    }
  }
}