import { db } from '../../server/db';
import { users, type InsertUser, type User } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';

export interface CreateUserFromTelegramParams {
  telegram_id: number;
  username?: string;
  first_name?: string;
  ref_by?: string; // реферальный код пригласителя
}

export class UserRepository {
  private generateRefCode = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

  /**
   * Находит пользователя по telegram_id
   */
  async findByTelegramId(telegramId: number): Promise<User | null> {
    try {
      console.log('[UserRepository] Searching user by telegram_id:', telegramId);
      
      const [user] = await db.select()
        .from(users)
        .where(eq(users.telegram_id, telegramId))
        .limit(1);

      if (user) {
        console.log('[UserRepository] User found:', user.id);
        return user;
      }

      console.log('[UserRepository] User not found for telegram_id:', telegramId);
      return null;
    } catch (error) {
      console.error('[UserRepository] Error finding user by telegram_id:', error);
      return null;
    }
  }

  /**
   * Находит пользователя по реферальному коду
   */
  async findByRefCode(refCode: string): Promise<User | null> {
    try {
      const [user] = await db.select()
        .from(users)
        .where(eq(users.ref_code, refCode))
        .limit(1);

      return user || null;
    } catch (error) {
      console.error('[UserRepository] Error finding user by ref_code:', error);
      return null;
    }
  }

  /**
   * Создает нового пользователя из данных Telegram
   */
  async createUserFromTelegram(params: CreateUserFromTelegramParams): Promise<User> {
    try {
      console.log('[UserRepository] Creating new user from Telegram data:', params);

      // Генерируем уникальный реферальный код
      let refCode: string;
      let isUnique = false;
      let attempts = 0;
      
      do {
        refCode = this.generateRefCode();
        const existing = await this.findByRefCode(refCode);
        isUnique = !existing;
        attempts++;
        
        if (attempts > 10) {
          throw new Error('Failed to generate unique ref_code after 10 attempts');
        }
      } while (!isUnique);

      // Определяем parent_ref_code (кто пригласил)
      let parentRefCode: string | null = null;
      if (params.ref_by) {
        const inviter = await this.findByRefCode(params.ref_by);
        if (inviter) {
          parentRefCode = params.ref_by;
          console.log('[UserRepository] Found inviter:', inviter.id);
        } else {
          console.warn('[UserRepository] Invalid ref_by code provided:', params.ref_by);
        }
      }

      // Создаем пользователя
      const userData: InsertUser = {
        telegram_id: params.telegram_id,
        username: params.username || params.first_name || `user_${params.telegram_id}`,
        ref_code: refCode,
        parent_ref_code: parentRefCode
      };

      const [newUser] = await db.insert(users)
        .values(userData)
        .returning();

      console.log('[UserRepository] Successfully created user:', newUser.id);
      return newUser;
    } catch (error) {
      console.error('[UserRepository] Error creating user from Telegram:', error);
      throw error;
    }
  }

  /**
   * Обновляет данные пользователя
   */
  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | null> {
    try {
      const [updatedUser] = await db.update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();

      return updatedUser || null;
    } catch (error) {
      console.error('[UserRepository] Error updating user:', error);
      return null;
    }
  }

  /**
   * Проверяет уникальность telegram_id и username
   */
  async checkUniqueness(telegramId: number, username?: string): Promise<{
    telegramIdExists: boolean;
    usernameExists: boolean;
  }> {
    try {
      const telegramIdCheck = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.telegram_id, telegramId))
        .limit(1);

      let usernameCheck: any[] = [];
      if (username) {
        usernameCheck = await db.select({ id: users.id })
          .from(users)
          .where(eq(users.username, username))
          .limit(1);
      }

      return {
        telegramIdExists: telegramIdCheck.length > 0,
        usernameExists: usernameCheck.length > 0
      };
    } catch (error) {
      console.error('[UserRepository] Error checking uniqueness:', error);
      return {
        telegramIdExists: false,
        usernameExists: false
      };
    }
  }
}