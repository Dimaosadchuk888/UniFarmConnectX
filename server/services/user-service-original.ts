/**
 * Оригинальный сервис для работы с пользователями
 * 
 * Этот файл содержит все методы для работы с пользователями,
 * которые будут реэкспортироваться через прокси-файлы
 */

import { db } from '../db';
import { users, User, InsertUser } from '@shared/schema';
import { eq, or, and, sql } from 'drizzle-orm';
import { IExtendedStorage } from '../storage-interface';

/**
 * Интерфейс сервиса для работы с пользователями
 */
export interface IUserService {
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByRefCode(refCode: string): Promise<User | undefined>;
  createUser(userData: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  updateRefCode(id: number, refCode: string): Promise<User | undefined>;
  generateRefCode(): Promise<string>;
}

/**
 * Фабрика для создания сервиса пользователей
 */
export function createUserService(storage: IExtendedStorage): IUserService {
  return {
    /**
     * Получает пользователя по ID
     */
    async getUserById(id: number): Promise<User | undefined> {
      if (!id) return undefined;
      
      try {
        return await storage.getUser(id);
      } catch (error) {
        console.error('[UserService] Error in getUserById:', error);
        return undefined;
      }
    },

    /**
     * Получает пользователя по имени пользователя
     */
    async getUserByUsername(username: string): Promise<User | undefined> {
      if (!username) return undefined;
      
      try {
        return await storage.getUserByUsername(username);
      } catch (error) {
        console.error('[UserService] Error in getUserByUsername:', error);
        return undefined;
      }
    },

    /**
     * Получает пользователя по реферальному коду
     */
    async getUserByRefCode(refCode: string): Promise<User | undefined> {
      if (!refCode) return undefined;
      
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.ref_code, refCode));
        
        return user;
      } catch (error) {
        console.error('[UserService] Error in getUserByRefCode:', error);
        return undefined;
      }
    },

    /**
     * Создает нового пользователя
     */
    async createUser(userData: InsertUser): Promise<User> {
      try {
        return await storage.createUser(userData);
      } catch (error) {
        console.error('[UserService] Error in createUser:', error);
        throw error;
      }
    },

    /**
     * Обновляет данные пользователя
     */
    async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
      try {
        const [updatedUser] = await db
          .update(users)
          .set(userData)
          .where(eq(users.id, id))
          .returning();
        
        return updatedUser;
      } catch (error) {
        console.error('[UserService] Error in updateUser:', error);
        return undefined;
      }
    },

    /**
     * Обновляет реферальный код пользователя
     */
    async updateRefCode(id: number, refCode: string): Promise<User | undefined> {
      try {
        const [updatedUser] = await db
          .update(users)
          .set({ ref_code: refCode })
          .where(eq(users.id, id))
          .returning();
        
        return updatedUser;
      } catch (error) {
        console.error('[UserService] Error in updateRefCode:', error);
        return undefined;
      }
    },

    /**
     * Генерирует уникальный реферальный код
     */
    async generateRefCode(): Promise<string> {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const codeLength = 8;
      
      let isUnique = false;
      let refCode = '';
      
      while (!isUnique) {
        // Генерируем случайный код
        refCode = '';
        for (let i = 0; i < codeLength; i++) {
          refCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        // Проверяем, что такого кода еще нет в базе
        const existingUser = await this.getUserByRefCode(refCode);
        isUnique = !existingUser;
      }
      
      return refCode;
    }
  };
}

/**
 * Тип сервиса пользователей
 * Используется для аннотации импортов из этого модуля
 */
export type UserService = ReturnType<typeof createUserService>;

/**
 * Статический API для обратной совместимости с существующим кодом
 * These static methods are maintained for backward compatibility
 */
export const UserService = {
  async getUserById(id: number): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
      
      return user;
    } catch (error) {
      console.error('[UserService] Static error in getUserById:', error);
      return undefined;
    }
  },
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      
      return user;
    } catch (error) {
      console.error('[UserService] Static error in getUserByUsername:', error);
      return undefined;
    }
  },
  
  async getUserByRefCode(refCode: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.ref_code, refCode));
      
      return user;
    } catch (error) {
      console.error('[UserService] Static error in getUserByRefCode:', error);
      return undefined;
    }
  },
  
  async createUser(userData: InsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      
      return user;
    } catch (error) {
      console.error('[UserService] Static error in createUser:', error);
      throw error;
    }
  },
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error('[UserService] Static error in updateUser:', error);
      return undefined;
    }
  },
  
  async updateRefCode(id: number, refCode: string): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ ref_code: refCode })
        .where(eq(users.id, id))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error('[UserService] Static error in updateRefCode:', error);
      return undefined;
    }
  },
  
  async generateRefCode(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = 8;
    
    let isUnique = false;
    let refCode = '';
    
    while (!isUnique) {
      // Генерируем случайный код
      refCode = '';
      for (let i = 0; i < codeLength; i++) {
        refCode += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Проверяем, что такого кода еще нет в базе
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.ref_code, refCode));
      
      isUnique = !existingUser;
    }
    
    return refCode;
  }
};