import { db } from '../db';
import { users, transactions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { TransactionService } from './transactionService';

/**
 * Сервис для работы с ежедневными бонусами (check-in)
 */
export class DailyBonusService {
  // Размер ежедневного бонуса 
  static readonly DAILY_BONUS_AMOUNT = 500;
  
  /**
   * Проверяет, доступен ли пользователю ежедневный бонус
   * @param userId ID пользователя
   * @returns {Promise<{canClaim: boolean, streak: number}>} Может ли пользователь получить бонус и текущая серия
   */
  static async canClaimDailyBonus(userId: number): Promise<{canClaim: boolean, streak: number}> {
    const [user] = await db
      .select({
        checkin_last_date: users.checkin_last_date,
        checkin_streak: users.checkin_streak
      })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return { canClaim: false, streak: 0 };
    }
    
    // Если пользователь никогда не получал бонус
    if (!user.checkin_last_date) {
      return { canClaim: true, streak: 0 };
    }
    
    const lastClaimDate = new Date(user.checkin_last_date);
    const now = new Date();
    
    // Проверяем, был ли чекин уже сегодня
    const isSameDay = 
      lastClaimDate.getDate() === now.getDate() && 
      lastClaimDate.getMonth() === now.getMonth() &&
      lastClaimDate.getFullYear() === now.getFullYear();
    
    if (isSameDay) {
      return { canClaim: false, streak: user.checkin_streak };
    }
    
    return { canClaim: true, streak: user.checkin_streak };
  }
  
  /**
   * Выдает пользователю ежедневный бонус
   * @param userId ID пользователя
   * @returns {Promise<{success: boolean, message: string, amount?: number, streak?: number}>} Результат операции
   */
  static async claimDailyBonus(userId: number): Promise<{success: boolean, message: string, amount?: number, streak?: number}> {
    try {
      // Проверяем, доступен ли бонус
      const { canClaim, streak } = await this.canClaimDailyBonus(userId);
      
      if (!canClaim) {
        return { 
          success: false, 
          message: 'Вы уже получили бонус сегодня. Возвращайтесь завтра!' 
        };
      }
      
      // Начинаем транзакцию
      return await db.transaction(async (tx) => {
        // 1. Обновляем баланс пользователя
        await tx
          .update(users)
          .set({ 
            balance_uni: sql`${users.balance_uni} + ${this.DAILY_BONUS_AMOUNT}`,
            checkin_last_date: new Date(),
            checkin_streak: streak + 1
          })
          .where(eq(users.id, userId));
        
        // 2. Создаем запись о транзакции
        await tx
          .insert(transactions)
          .values({
            user_id: userId,
            type: 'check-in',
            currency: 'UNI',
            amount: this.DAILY_BONUS_AMOUNT.toString(),
            status: 'confirmed'
          });
        
        return { 
          success: true, 
          message: 'Ежедневный бонус успешно получен!',
          amount: this.DAILY_BONUS_AMOUNT,
          streak: streak + 1
        };
      });
    } catch (error) {
      console.error('Error claiming daily bonus:', error);
      return { 
        success: false, 
        message: 'Произошла ошибка при получении бонуса. Попробуйте позже.' 
      };
    }
  }
}