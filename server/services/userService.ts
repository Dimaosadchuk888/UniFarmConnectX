/**
 * Сервис для работы с пользователями
 * 
 * Использует единый интерфейс хранилища (IExtendedStorage) для всех операций с данными.
 * Это позволяет абстрагироваться от конкретной реализации хранилища и легко
 * менять его без изменения логики сервиса.
 */

import { User, InsertUser } from '@shared/schema';
import { IExtendedStorage, StorageErrors } from '../storage-interface';

/**
 * Интерфейс сервиса для работы с пользователями
 */
export interface IUserService {
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGuestId(guestId: string): Promise<User | undefined>;
  getUserByRefCode(refCode: string): Promise<User | undefined>;
  getUserByTelegramId(telegramId: number): Promise<User | undefined>;
  createUser(userData: InsertUser): Promise<User>;
  updateUserBalance(userId: number, currencyType: 'uni' | 'ton', amount: string): Promise<User | undefined>;
  updateUserRefCode(userId: number, refCode: string): Promise<User | undefined>;
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
     * Получает пользователя по гостевому ID
     */
    async getUserByGuestId(guestId: string): Promise<User | undefined> {
      if (!guestId) return undefined;
      
      try {
        return await storage.getUserByGuestId(guestId);
      } catch (error) {
        console.error('[UserService] Error in getUserByGuestId:', error);
        return undefined;
      }
    },

    /**
     * Получает пользователя по реферальному коду
     */
    async getUserByRefCode(refCode: string): Promise<User | undefined> {
      if (!refCode) return undefined;
      
      try {
        return await storage.getUserByRefCode(refCode);
      } catch (error) {
        console.error('[UserService] Error in getUserByRefCode:', error);
        return undefined;
      }
    },

    /**
     * Получает пользователя по Telegram ID
     */
    async getUserByTelegramId(telegramId: number): Promise<User | undefined> {
      if (!telegramId) return undefined;
      
      try {
        return await storage.getUserByTelegramId(telegramId);
      } catch (error) {
        console.error('[UserService] Error in getUserByTelegramId:', error);
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
     * Обновляет баланс пользователя
     */
    async updateUserBalance(userId: number, currencyType: 'uni' | 'ton', amount: string): Promise<User | undefined> {
      try {
        // Преобразуем тип валюты к верхнему регистру для соответствия интерфейсу хранилища
        const currency = currencyType === 'uni' ? 'UNI' : 'TON';
        
        return await storage.updateUserBalance(userId, currency, amount);
      } catch (error) {
        console.error('[UserService] Error in updateUserBalance:', error);
        return undefined;
      }
    },

    /**
     * Обновляет реферальный код пользователя
     */
    async updateUserRefCode(userId: number, refCode: string): Promise<User | undefined> {
      try {
        return await storage.updateUserRefCode(userId, refCode);
      } catch (error) {
        console.error('[UserService] Error in updateUserRefCode:', error);
        return undefined;
      }
    },

    /**
     * Генерирует уникальный реферальный код
     */
    async generateRefCode(): Promise<string> {
      try {
        return await storage.generateUniqueRefCode();
      } catch (error) {
        console.error('[UserService] Error in generateRefCode:', error);
        // Используем синхронную версию генерации кода при ошибке
        return storage.generateRefCode();
      }
    }
  };
}

/**
 * Тип сервиса пользователей
 * Используется для аннотации импортов из этого модуля
 */
export type UserService = ReturnType<typeof createUserService>;