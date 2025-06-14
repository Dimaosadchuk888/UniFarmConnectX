/**
 * User Model
 * Пользовательские модели и схемы для работы с базой данных
 */

import { supabase } from '../../core/supabaseClient';
import { type User, type InsertUser } from '../../shared/schema.js';
import { logger } from '../../core/logger.js';

export class UserModel {
  /**
   * Поиск пользователя по ID
   */
  static async findById(id: number): Promise<User | null> {
    try {
      const { data: usersData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .limit(1);

      if (error) {
        logger.error('[UserModel] Ошибка получения пользователя по ID:', error.message);
        throw error;
      }

      const user = usersData?.[0];
      
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
      const { data: usersData, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', Number(telegramId))
        .limit(1);

      if (error) {
        logger.error('[UserModel] Ошибка получения пользователя по Telegram ID:', error.message);
        throw error;
      }

      const user = usersData?.[0];
      
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
      const { data: usersData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', parseInt(guestId))
        .limit(1);

      if (error) {
        logger.error('[UserModel] Ошибка получения пользователя по Guest ID:', error.message);
        throw error;
      }

      const user = usersData?.[0];
      
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
      const { data: newUsersData, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (error) {
        logger.error('[UserModel] Ошибка создания пользователя:', error.message);
        throw error;
      }

      const newUser = newUsersData;
      
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
      const { data: updatedUsersData, error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('[UserModel] Ошибка обновления пользователя:', error.message);
        throw error;
      }

      const updatedUser = updatedUsersData;
      
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

      const { data: updatedUsersData, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('[UserModel] Ошибка обновления баланса:', error.message);
        throw error;
      }

      const updatedUser = updatedUsersData;
      
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
      const { data: usersList, error } = await supabase
        .from('users')
        .select('*')
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('[UserModel] Ошибка получения списка пользователей:', error.message);
        throw error;
      }
      
      return usersList;
    } catch (error) {
      logger.error('[UserModel] Ошибка получения списка пользователей', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }
}

// Экспорт для совместимости с существующими импортами
export default UserModel;