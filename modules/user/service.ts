import type { User, InsertUser } from '../../shared/schema.js';
import { db } from '../../server/db.js';
import { users } from '../../shared/schema.js';
import { eq, sql } from 'drizzle-orm';
import { logger } from '../../core/logger';

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
      logger.error('[UserService] Ошибка получения пользователя', { error: error instanceof Error ? error.message : String(error) });
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
      logger.error('[UserService] Ошибка создания пользователя', { error: error instanceof Error ? error.message : String(error) });
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
      logger.error('[UserService] Ошибка обновления пользователя', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(users)
        .where(eq(users.id, parseInt(id)));
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      logger.error('[UserService] Ошибка удаления пользователя', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async getUserByTelegramId(telegramId: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(sql`${users.telegram_id} = ${Number(telegramId)}`)
        .limit(1);
      
      return user || null;
    } catch (error) {
      logger.error('[UserService] Ошибка поиска по Telegram ID', { error: error instanceof Error ? error.message : String(error) });
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
      logger.error('[UserService] Ошибка генерации ref_code', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async validateUser(userData: { telegram_id?: number; username?: string; [key: string]: unknown }): Promise<boolean> {
    // Валидация данных пользователя
    try {
      if (!userData.telegram_id) {
        return false;
      }
      return true;
    } catch (error) {
      logger.error('[UserService] Ошибка валидации пользователя', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }
}