import type { User, InsertUser } from '../../shared/schema.js';
import { db } from '../../core/db';
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

  /**
   * Универсальная функция гарантированной регистрации пользователя из Telegram
   * Если пользователь существует - возвращает его, если нет - создает
   */
  async getOrCreateUserFromTelegram(initData: {
    telegram_id: number;
    username?: string;
    ref_code?: string;
  }): Promise<User> {
    try {
      logger.info('[UserService] Попытка найти или создать пользователя', {
        telegram_id: initData.telegram_id,
        username: initData.username,
        has_ref_code: !!initData.ref_code
      });

      // Сначала пытаемся найти существующего пользователя
      const existingUser = await this.getUserByTelegramId(String(initData.telegram_id));
      
      if (existingUser) {
        logger.info('[UserService] Пользователь найден в базе', { 
          user_id: existingUser.id,
          ref_code: existingUser.ref_code 
        });

        // Обновляем username если он изменился в Telegram
        if (initData.username && initData.username !== existingUser.username) {
          await this.updateUser(String(existingUser.id), {
            username: initData.username
          });
          
          logger.info('[UserService] Обновлен username пользователя', { 
            user_id: existingUser.id,
            old_username: existingUser.username,
            new_username: initData.username
          });
        }

        return existingUser;
      }

      // Пользователь не найден - создаем нового
      logger.info('[UserService] Создание нового пользователя из Telegram', {
        telegram_id: initData.telegram_id,
        username: initData.username
      });

      // Генерируем уникальный ref_code
      const timestamp = Date.now();
      const refCode = `REF${initData.telegram_id}${timestamp}`.substring(0, 12).toUpperCase();

      // Определяем referred_by если передан ref_code
      let referredBy: number | null = null;
      if (initData.ref_code) {
        try {
          const referrer = await db
            .select()
            .from(users)
            .where(eq(users.ref_code, initData.ref_code))
            .limit(1);
          
          if (referrer.length > 0) {
            referredBy = referrer[0].id;
            logger.info('[UserService] Найден реферер', { 
              ref_code: initData.ref_code,
              referrer_id: referredBy 
            });
          }
        } catch (error) {
          logger.warn('[UserService] Ошибка поиска реферера', { 
            ref_code: initData.ref_code,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Создаем нового пользователя
      const newUserData: InsertUser = {
        telegram_id: initData.telegram_id,
        username: initData.username || null,
        ref_code: refCode,
        parent_ref_code: initData.ref_code || null
      };

      const newUser = await this.createUser(newUserData);

      logger.info('[UserService] Новый пользователь создан', {
        user_id: newUser.id,
        telegram_id: newUser.telegram_id,
        username: newUser.username,
        ref_code: newUser.ref_code
      });

      return newUser;

    } catch (error) {
      logger.error('[UserService] Критическая ошибка getOrCreateUserFromTelegram', {
        telegram_id: initData.telegram_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Поиск пользователя по Telegram ID
   */
  async findUserByTelegramId(telegramId: number): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.telegram_id, telegramId))
        .limit(1);
      
      return user || null;
    } catch (error) {
      logger.error('[UserService] Ошибка поиска пользователя по Telegram ID', { 
        telegramId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Создание пользователя из данных Telegram
   */
  async createFromTelegram(telegramData: {
    telegram_id: number;
    username?: string;
    first_name?: string;
    ref_by?: string;
  }): Promise<User> {
    try {
      logger.info('[UserService] Создание пользователя из Telegram данных', {
        telegram_id: telegramData.telegram_id,
        username: telegramData.username,
        has_ref: !!telegramData.ref_by
      });

      // Генерируем уникальный ref_code
      const timestamp = Date.now();
      const refCode = `REF${telegramData.telegram_id}${timestamp}`.substring(0, 12).toUpperCase();

      // Определяем parent_ref_code если передан ref_by
      let parentRefCode: string | null = null;
      if (telegramData.ref_by) {
        try {
          const referrer = await db
            .select()
            .from(users)
            .where(eq(users.ref_code, telegramData.ref_by))
            .limit(1);
          
          if (referrer.length > 0) {
            parentRefCode = telegramData.ref_by;
            logger.info('[UserService] Найден реферер для нового пользователя', { 
              ref_code: telegramData.ref_by,
              referrer_id: referrer[0].id 
            });
          }
        } catch (error) {
          logger.warn('[UserService] Ошибка поиска реферера', { 
            ref_code: telegramData.ref_by,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Создаем нового пользователя
      const newUserData: InsertUser = {
        telegram_id: telegramData.telegram_id,
        username: telegramData.username || null,
        first_name: telegramData.first_name || null,
        ref_code: refCode,
        parent_ref_code: parentRefCode
      };

      const newUser = await this.createUser(newUserData);

      logger.info('[UserService] Пользователь создан из Telegram данных', {
        user_id: newUser.id,
        telegram_id: newUser.telegram_id,
        ref_code: newUser.ref_code,
        has_parent_ref: !!newUser.parent_ref_code
      });

      return newUser;

    } catch (error) {
      logger.error('[UserService] Ошибка создания пользователя из Telegram', {
        telegram_id: telegramData.telegram_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Поиск или создание пользователя из Telegram данных
   */
  async findOrCreateFromTelegram(telegramData: {
    telegram_id: number;
    username?: string;
    first_name?: string;
    ref_by?: string;
  }): Promise<User> {
    try {
      // Сначала пытаемся найти существующего пользователя
      const existingUser = await this.findUserByTelegramId(telegramData.telegram_id);
      
      if (existingUser) {
        logger.info('[UserService] Найден существующий пользователь', { 
          user_id: existingUser.id,
          telegram_id: existingUser.telegram_id
        });

        // Обновляем username если он изменился
        if (telegramData.username && telegramData.username !== existingUser.username) {
          await this.updateUser(String(existingUser.id), {
            username: telegramData.username
          });
          logger.info('[UserService] Обновлен username', { 
            user_id: existingUser.id,
            new_username: telegramData.username
          });
        }

        return existingUser;
      }

      // Пользователь не найден - создаем нового
      return await this.createFromTelegram(telegramData);

    } catch (error) {
      logger.error('[UserService] Ошибка findOrCreateFromTelegram', {
        telegram_id: telegramData.telegram_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Обновление реферального кода пользователя
   */
  async updateUserRefCode(userId: number, refCode: string): Promise<User> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ ref_code: refCode })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        throw new Error('User not found or update failed');
      }

      logger.info('[UserService] Ref_code обновлен', {
        user_id: userId,
        ref_code: refCode
      });

      return updatedUser;
    } catch (error) {
      logger.error('[UserService] Ошибка обновления ref_code', {
        user_id: userId,
        ref_code: refCode,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}