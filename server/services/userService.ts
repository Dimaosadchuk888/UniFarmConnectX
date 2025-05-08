/**
 * Сервис для работы с пользователями
 * 
 * Использует единый интерфейс хранилища (IExtendedStorage) для всех операций с данными.
 * Это позволяет абстрагироваться от конкретной реализации хранилища и легко
 * менять его без изменения логики сервиса.
 */

import { User, InsertUser } from '@shared/schema';
import { IExtendedStorage, StorageErrors } from '../storage-interface';
import { NotFoundError, DatabaseError } from '../middleware/errorHandler';

// Тип для безопасного доступа к свойству message у ошибок
type ErrorWithMessage = { message: string };

/**
 * Интерфейс сервиса для работы с пользователями
 * 
 * Все методы могут выбрасывать исключения:
 * @throws {NotFoundError} Если пользователь не найден
 * @throws {DatabaseError} При ошибке в базе данных
 */
export interface IUserService {
  /**
   * Получает пользователя по ID
   * @param id ID пользователя
   * @returns Объект пользователя или undefined, если пользователь не найден
   * @throws {DatabaseError} При ошибке в базе данных
   */
  getUserById(id: number): Promise<User | undefined>;
  
  /**
   * Получает пользователя по имени пользователя
   * @param username Имя пользователя
   * @returns Объект пользователя или undefined, если пользователь не найден
   */
  getUserByUsername(username: string): Promise<User | undefined>;
  
  /**
   * Получает пользователя по гостевому ID
   * @param guestId Гостевой ID
   * @returns Объект пользователя или undefined, если пользователь не найден
   */
  getUserByGuestId(guestId: string): Promise<User | undefined>;
  
  /**
   * Получает пользователя по реферальному коду
   * @param refCode Реферальный код
   * @returns Объект пользователя или undefined, если пользователь не найден
   */
  getUserByRefCode(refCode: string): Promise<User | undefined>;
  
  /**
   * Получает пользователя по Telegram ID
   * @param telegramId Telegram ID
   * @returns Объект пользователя или undefined, если пользователь не найден
   */
  getUserByTelegramId(telegramId: number): Promise<User | undefined>;
  
  /**
   * Создает нового пользователя
   * @param userData Данные пользователя
   * @returns Созданный объект пользователя
   * @throws {DatabaseError} При ошибке в базе данных
   */
  createUser(userData: InsertUser): Promise<User>;
  
  /**
   * Обновляет баланс пользователя
   * @param userId ID пользователя
   * @param currencyType Тип валюты (uni или ton)
   * @param amount Сумма изменения баланса (положительная или отрицательная)
   * @returns Обновленный объект пользователя или undefined в случае ошибки
   * @throws {NotFoundError} Если пользователь не найден
   * @throws {DatabaseError} При ошибке в базе данных
   */
  updateUserBalance(userId: number, currencyType: 'uni' | 'ton', amount: string): Promise<User | undefined>;
  
  /**
   * Обновляет реферальный код пользователя
   * @param userId ID пользователя
   * @param refCode Новый реферальный код
   * @returns Обновленный объект пользователя или undefined в случае ошибки
   * @throws {NotFoundError} Если пользователь не найден
   * @throws {DatabaseError} При ошибке в базе данных или если код не уникален
   */
  updateUserRefCode(userId: number, refCode: string): Promise<User | undefined>;
  
  /**
   * Генерирует уникальный реферальный код
   * @returns Сгенерированный реферальный код
   * @throws {DatabaseError} При ошибке в базе данных
   */
  generateRefCode(): Promise<string>;
}

/**
 * Фабрика для создания сервиса пользователей
 */
export function createUserService(storage: IExtendedStorage): IUserService {
  return {
    /**
     * Получает пользователя по ID
     * @throws {DatabaseError} При ошибке в базе данных
     */
    async getUserById(id: number): Promise<User | undefined> {
      if (!id) return undefined;
      
      try {
        return await storage.getUser(id);
      } catch (error) {
        const err = error as ErrorWithMessage;
        console.error('[UserService] Error in getUserById:', err.message);
        throw new DatabaseError(`Ошибка при получении пользователя по ID ${id}: ${err.message}`, error);
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
     * @throws {DatabaseError} При ошибке в базе данных
     */
    async createUser(userData: InsertUser): Promise<User> {
      try {
        return await storage.createUser(userData);
      } catch (error) {
        // Логируем ошибку и преобразуем в DatabaseError
        const err = error as ErrorWithMessage;
        console.error('[UserService] Error in createUser:', err.message);
        throw new DatabaseError(`Ошибка при создании пользователя: ${err.message}`, error);
      }
    },

    /**
     * Обновляет баланс пользователя
     * @throws {NotFoundError} Если пользователь не найден
     * @throws {DatabaseError} При ошибке в базе данных
     */
    async updateUserBalance(userId: number, currencyType: 'uni' | 'ton', amount: string): Promise<User | undefined> {
      try {
        // Проверяем существование пользователя
        const user = await this.getUserById(userId);
        if (!user) {
          throw new NotFoundError(`Пользователь с ID ${userId} не найден`);
        }
        
        // Преобразуем тип валюты к верхнему регистру для соответствия интерфейсу хранилища
        const currency = currencyType === 'uni' ? 'UNI' : 'TON';
        
        return await storage.updateUserBalance(userId, currency, amount);
      } catch (error) {
        // Пропускаем NotFoundError дальше без изменений
        if (error instanceof NotFoundError) {
          throw error;
        }
        
        // Логируем ошибку и преобразуем в DatabaseError
        const err = error as ErrorWithMessage;
        console.error('[UserService] Error in updateUserBalance:', err.message);
        throw new DatabaseError(`Ошибка при обновлении баланса пользователя: ${err.message}`, error);
      }
    },

    /**
     * Обновляет реферальный код пользователя
     * @throws {NotFoundError} Если пользователь не найден
     * @throws {DatabaseError} При ошибке в базе данных
     */
    async updateUserRefCode(userId: number, refCode: string): Promise<User | undefined> {
      try {
        // Проверяем существование пользователя
        const user = await this.getUserById(userId);
        if (!user) {
          throw new NotFoundError(`Пользователь с ID ${userId} не найден`);
        }
        
        // Проверяем уникальность реферального кода
        const isUnique = await storage.isRefCodeUnique(refCode);
        if (!isUnique) {
          throw new DatabaseError(`Реферальный код ${refCode} уже используется`);
        }
        
        return await storage.updateUserRefCode(userId, refCode);
      } catch (error) {
        // Пропускаем NotFoundError дальше без изменений
        if (error instanceof NotFoundError || error instanceof DatabaseError) {
          throw error;
        }
        
        // Логируем ошибку и преобразуем в DatabaseError
        const err = error as ErrorWithMessage;
        console.error('[UserService] Error in updateUserRefCode:', err.message);
        throw new DatabaseError(`Ошибка при обновлении реферального кода: ${err.message}`, error);
      }
    },

    /**
     * Генерирует уникальный реферальный код
     * @throws {DatabaseError} При ошибке в базе данных
     */
    async generateRefCode(): Promise<string> {
      try {
        return await storage.generateUniqueRefCode();
      } catch (error) {
        // Логируем ошибку, но используем синхронную версию генерации кода при ошибке
        const err = error as ErrorWithMessage;
        console.error('[UserService] Error in generateRefCode:', err.message);
        
        try {
          // Пытаемся использовать локальный генератор как запасной вариант
          return storage.generateRefCode();
        } catch (fallbackError) {
          const fallbackErr = fallbackError as ErrorWithMessage;
          throw new DatabaseError(`Не удалось сгенерировать реферальный код: ${fallbackErr.message}`, fallbackError);
        }
      }
    }
  };
}

/**
 * Тип сервиса пользователей
 * Используется для аннотации импортов из этого модуля
 */
export type UserService = ReturnType<typeof createUserService>;

// Импортируем экземпляр сервиса для прокси-функций
import { userServiceInstance } from './userServiceInstance.js';

/**
 * Прокси для доступа к методам userServiceInstance
 * 
 * Это позволяет использовать статические методы для доступа к экземпляру сервиса,
 * что упрощает использование сервиса в существующем коде.
 */
export const getUserById = (id: number): Promise<User | undefined> => userServiceInstance.getUserById(id);
export const getUserByUsername = (username: string): Promise<User | undefined> => userServiceInstance.getUserByUsername(username);
export const getUserByGuestId = (guestId: string): Promise<User | undefined> => userServiceInstance.getUserByGuestId(guestId);
export const getUserByRefCode = (refCode: string): Promise<User | undefined> => userServiceInstance.getUserByRefCode(refCode);
export const getUserByTelegramId = (telegramId: number): Promise<User | undefined> => userServiceInstance.getUserByTelegramId(telegramId);
export const createUser = (userData: InsertUser): Promise<User> => userServiceInstance.createUser(userData);
export const updateUserBalance = (userId: number, currencyType: 'uni' | 'ton', amount: string): Promise<User | undefined> => userServiceInstance.updateUserBalance(userId, currencyType, amount);
export const updateUserRefCode = (userId: number, refCode: string): Promise<User | undefined> => userServiceInstance.updateUserRefCode(userId, refCode);
export const generateRefCode = (): Promise<string> => userServiceInstance.generateRefCode();