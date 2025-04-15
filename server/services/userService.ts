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
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegram_id, telegramId));
    
    return user;
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
}