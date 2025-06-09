/**
 * User Model
 * Пользовательские модели и схемы для работы с базой данных
 */

import { db } from '../../server/db';
import { users, type User, type InsertUser } from '../../shared/schema';
import { eq } from 'drizzle-orm';

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
      console.error('[UserModel] Ошибка поиска пользователя по ID:', error);
      return null;
    }
  }

  /**
   * Поиск пользователя по Telegram ID
   */
  static async findByTelegramId(telegramId: number): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.telegram_id, telegramId))
        .limit(1);
      
      return user || null;
    } catch (error) {
      console.error('[UserModel] Ошибка поиска пользователя по Telegram ID:', error);
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
        .where(eq(users.guest_id, guestId))
        .limit(1);
      
      return user || null;
    } catch (error) {
      console.error('[UserModel] Ошибка поиска пользователя по Guest ID:', error);
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
      console.error('[UserModel] Ошибка создания пользователя:', error);
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
      console.error('[UserModel] Ошибка обновления пользователя:', error);
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
      console.error('[UserModel] Ошибка обновления баланса:', error);
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
      console.error('[UserModel] Ошибка получения списка пользователей:', error);
      return [];
    }
  }
}

// Экспорт для совместимости с существующими импортами
export default UserModel;