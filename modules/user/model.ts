/**
 * User Model
 * Пользовательские модели и схемы для работы с базой данных
 */

import { db } from '../../server/db.js';
import { users, type User, type InsertUser } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../../core/logger.js';

export class UserModel {
  /**
   * Поиск пользователя по ID
   */
  static async findById(id: number): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      return user || null;
    } catch (error) {
      logger.error('[UserModel] Ошибка поиска пользователя по ID', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Поиск пользователя по Telegram ID
   */
  static async findByTelegramId(telegramId: string | number): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.telegram_id, Number(telegramId)))
        .limit(1);
      
      return user || null;
    } catch (error) {
      logger.error('[UserModel] Ошибка поиска пользователя по Telegram ID', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Поиск пользователя по guest ID
   */
  static async findByGuestId(guestId: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(guestId)))
        .limit(1);
      
      return user || null;
    } catch (error) {
      logger.error('[UserModel] Ошибка поиска пользователя по Guest ID', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Создание нового пользователя
   */
  static async create(userData: Omit<InsertUser, 'id'>): Promise<User | null> {
    try {
      const [newUser] = await db
        .insert(users)
        .values(userData)
        .returning();
      
      return newUser || null;
    } catch (error) {
      logger.error('[UserModel] Ошибка создания пользователя', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Обновление данных пользователя
   */
  static async update(id: number, userData: Partial<InsertUser>): Promise<User | null> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      
      return updatedUser || null;
    } catch (error) {
      logger.error('[UserModel] Ошибка обновления пользователя', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Обновление баланса пользователя
   */
  static async updateBalance(
    id: number, 
    balanceUni?: string, 
    balanceTon?: string
  ): Promise<User | null> {
    try {
      const updateData: Partial<InsertUser> = {};
      
      if (balanceUni !== undefined) {
        updateData.balance_uni = balanceUni;
      }
      
      if (balanceTon !== undefined) {
        updateData.balance_ton = balanceTon;
      }

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();
      
      return updatedUser || null;
    } catch (error) {
      logger.error('[UserModel] Ошибка обновления баланса', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Получение всех пользователей (с пагинацией)
   */
  static async getAll(limit: number = 50, offset: number = 0): Promise<User[]> {
    try {
      const usersList = await db
        .select()
        .from(users)
        .limit(limit)
        .offset(offset);
      
      return usersList;
    } catch (error) {
      logger.error('[UserModel] Ошибка получения списка пользователей', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }
}

// Экспорт для совместимости с существующими импортами
export default UserModel;