import { db } from '../db';
import { users, User } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Сервис для работы с пользователями
 */
export class UserService {
  /**
   * Получает пользователя по ID
   * @param userId ID пользователя
   * @returns Данные пользователя или undefined
   */
  static async getUserById(userId: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    return user;
  }

  /**
   * Получает пользователя по Telegram ID
   * @param telegramId Telegram ID пользователя
   * @returns Данные пользователя или undefined
   */
  static async getUserByTelegramId(telegramId: number): Promise<User | undefined> {
    console.log(`[UserService] Searching for user with telegramId ${telegramId} (type: ${typeof telegramId})`);
    
    // Проверка на валидность ID
    if (!telegramId || isNaN(telegramId)) {
      console.error(`[UserService] Invalid telegramId: ${telegramId}`);
      return undefined;
    }
    
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.telegram_id, telegramId));
      
      if (user) {
        console.log(`[UserService] Found user with id=${user.id} for telegramId=${telegramId}`);
      } else {
        console.log(`[UserService] No user found for telegramId=${telegramId}`);
      }
      
      return user;
    } catch (error) {
      console.error(`[UserService] Error retrieving user by telegramId ${telegramId}:`, error);
      throw error;
    }
  }

  /**
   * Создает нового пользователя
   * @param userData Данные для создания пользователя
   * @returns Созданный пользователь
   */
  static async createUser(userData: any): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    
    return user;
  }

  /**
   * Обновляет данные пользователя
   * @param userId ID пользователя
   * @param userData Данные для обновления
   * @returns Обновленные данные пользователя
   */
  static async updateUser(userId: number, userData: any): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }
  
  /**
   * Обновляет баланс пользователя (специально для реферальной системы)
   * @param userId ID пользователя
   * @param balanceData Данные баланса для обновления
   * @returns Обновленные данные пользователя
   */
  static async updateUserBalance(userId: number, balanceData: {
    balance_uni?: string,
    balance_ton?: string
  }): Promise<User | undefined> {
    return this.updateUser(userId, balanceData);
  }
}