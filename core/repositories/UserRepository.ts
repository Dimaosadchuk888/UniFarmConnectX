import { db } from '../../server/db.js';
import { users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import type { User } from '../../shared/schema.js';

/**
 * Централізований репозиторій для роботи з користувачами
 * Усуває дублікати запитів до БД у всіх сервісах
 */
export class UserRepository {
  /**
   * Знайти користувача по Telegram ID
   */
  static async findByTelegramId(telegramId: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.telegram_id, telegramId))
        .limit(1);
      
      return user || null;
    } catch (error) {
      console.error('[UserRepository] Ошибка поиска по Telegram ID:', error);
      throw error;
    }
  }

  /**
   * Знайти користувача по ID
   */
  static async findById(id: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(id)))
        .limit(1);
      
      return user || null;
    } catch (error) {
      console.error('[UserRepository] Ошибка поиска по ID:', error);
      throw error;
    }
  }

  /**
   * Знайти користувача по Guest ID
   */
  static async findByGuestId(guestId: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.guest_id, guestId))
        .limit(1);
      
      return user || null;
    } catch (error) {
      console.error('[UserRepository] Ошибка поиска по Guest ID:', error);
      throw error;
    }
  }

  /**
   * Отримати користувача по Telegram ID з гарантією існування
   */
  static async requireByTelegramId(telegramId: string): Promise<User> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) {
      throw new Error(`Пользователь с Telegram ID ${telegramId} не найден`);
    }
    return user;
  }

  /**
   * Оновити користувача
   */
  static async update(id: string, data: Partial<User>): Promise<User | null> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set(data)
        .where(eq(users.id, parseInt(id)))
        .returning();
      
      return updatedUser || null;
    } catch (error) {
      console.error('[UserRepository] Ошибка обновления пользователя:', error);
      throw error;
    }
  }

  /**
   * Оновити баланс користувача
   */
  static async updateBalance(id: string, type: 'uni' | 'ton', amount: string): Promise<boolean> {
    try {
      const updateData = type === 'uni' 
        ? { balance_uni: amount }
        : { balance_ton: amount };
      
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, parseInt(id)))
        .returning();
      
      return !!updatedUser;
    } catch (error) {
      console.error('[UserRepository] Ошибка обновления баланса:', error);
      throw error;
    }
  }

  /**
   * Оновити timestamp фармінгу
   */
  static async updateFarmingTimestamps(id: string, data: {
    uni_farming_start_timestamp?: Date | null;
    uni_farming_last_update?: Date | null;
  }): Promise<boolean> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set(data)
        .where(eq(users.id, parseInt(id)))
        .returning();
      
      return !!updatedUser;
    } catch (error) {
      console.error('[UserRepository] Ошибка обновления farming timestamps:', error);
      throw error;
    }
  }
}