import type { User, InsertUser } from '../../shared/schema';
import { db } from '../../core/db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export class UserService {
  async getUserById(id: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(id)))
        .limit(1);
      
      return user || null;
    } catch (error) {
      console.error('[UserService] Ошибка получения пользователя:', error);
      throw error;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      const [newUser] = await db
        .insert(users)
        .values(userData)
        .returning();
      
      return newUser;
    } catch (error) {
      console.error('[UserService] Ошибка создания пользователя:', error);
      throw error;
    }
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, parseInt(id)))
        .returning();
      
      return updatedUser || null;
    } catch (error) {
      console.error('[UserService] Ошибка обновления пользователя:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(users)
        .where(eq(users.id, parseInt(id)));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('[UserService] Ошибка удаления пользователя:', error);
      throw error;
    }
  }

  async getUserByTelegramId(telegramId: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.telegram_id, parseInt(telegramId)))
        .limit(1);
      
      return user || null;
    } catch (error) {
      console.error('[UserService] Ошибка поиска по Telegram ID:', error);
      throw error;
    }
  }

  async getUserByGuestId(guestId: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.guest_id, guestId))
        .limit(1);
      
      return user || null;
    } catch (error) {
      console.error('[UserService] Ошибка поиска по Guest ID:', error);
      throw error;
    }
  }

  async generateRefCode(userId: string): Promise<string> {
    try {
      const refCode = `REF${userId}${Date.now()}`.substring(0, 12).toUpperCase();
      
      const [updatedUser] = await db
        .update(users)
        .set({ ref_code: refCode })
        .where(eq(users.id, parseInt(userId)))
        .returning();
      
      return updatedUser.ref_code || refCode;
    } catch (error) {
      console.error('[UserService] Ошибка генерации ref_code:', error);
      throw error;
    }
  }

  async validateUser(userData: any): Promise<boolean> {
    // Валидация данных пользователя
    try {
      if (!userData.telegram_id) {
        return false;
      }
      return true;
    } catch (error) {
      console.error('[UserService] Ошибка валидации пользователя:', error);
      return false;
    }
  }
}