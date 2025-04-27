import { db } from '../db';
import { users, User } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from '../storage';
import * as crypto from 'crypto';

/**
 * Сервис для работы с пользователями
 */
export class UserService {
  /**
   * Получает пользователя по ID
   * @param userId ID пользователя
   * @returns Данные пользователя или undefined
   */
  static async getUserById(userId: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    return user;
  }

  /**
   * Получает пользователя по Telegram ID
   * @param telegramId Telegram ID пользователя
   * @returns Данные пользователя или undefined
   */
  static async getUserByTelegramId(telegramId: number): Promise<User | undefined> {
    console.log(`[UserService] Searching for user with telegramId ${telegramId} (type: ${typeof telegramId})`);
    
    // Проверка на валидность ID
    if (!telegramId || isNaN(telegramId)) {
      console.error(`[UserService] Invalid telegramId: ${telegramId}`);
      return undefined;
    }
    
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.telegram_id, telegramId));
      
      if (user) {
        console.log(`[UserService] Found user with id=${user.id} for telegramId=${telegramId}`);
      } else {
        console.log(`[UserService] No user found for telegramId=${telegramId}`);
      }
      
      return user;
    } catch (error) {
      console.error(`[UserService] Error retrieving user by telegramId ${telegramId}:`, error);
      throw error;
    }
  }

  /**
   * Создает нового пользователя
   * @param userData Данные для создания пользователя
   * @returns Созданный пользователь
   */
  static async createUser(userData: any): Promise<User> {
    console.log(`[UserService] createUser: Trying to create user with userData:`, {
      telegram_id: userData.telegram_id,
      username: userData.username,
      ref_code: userData.ref_code,
      guest_id: userData.guest_id || 'not provided'
    });
    
    try {
      // Превращаем telegram_id в число, если это возможно (чтобы избежать ошибок БД)
      if (userData.telegram_id && typeof userData.telegram_id === 'string') {
        userData.telegram_id = parseInt(userData.telegram_id, 10);
        console.log(`[UserService] Converted telegram_id to number: ${userData.telegram_id}`);
      }
      
      // Проверка на null для telegram_id (PostgreSQL требует строгой типизации)
      if (userData.telegram_id === undefined || userData.telegram_id === null) {
        console.log(`[UserService] telegram_id is undefined/null, generating temporary ID`);
        userData.telegram_id = Math.floor(Date.now() / 1000);
      }
      
      // Проверка и установка базовых полей
      if (!userData.username) {
        userData.username = `user_${userData.telegram_id}`;
      }
      
      // ОБЯЗАТЕЛЬНО генерируем ref_code для всех новых пользователей
      // Используем асинхронный метод для гарантированно уникального кода
      if (!userData.ref_code) {
        // Генерируем уникальный реферальный код
        userData.ref_code = await storage.generateUniqueRefCode();
        console.log(`[UserService] Generated new unique ref_code: ${userData.ref_code}`);
      } else {
        // Проверяем уникальность предоставленного кода
        const isUnique = await storage.isRefCodeUnique(userData.ref_code);
        if (!isUnique) {
          console.log(`[UserService] Provided ref_code "${userData.ref_code}" is already in use. Generating new one.`);
          userData.ref_code = await storage.generateUniqueRefCode();
          console.log(`[UserService] Generated new unique ref_code: ${userData.ref_code}`);
        }
      }
      
      // Генерируем guest_id, если он не предоставлен
      if (!userData.guest_id) {
        userData.guest_id = crypto.randomUUID();
        console.log(`[UserService] Generated new guest_id: ${userData.guest_id}`);
      }
      
      // Установка значений по умолчанию для баланса
      if (!userData.balance_uni) {
        userData.balance_uni = "100"; // Начальный бонус в UNI
      }
      
      if (!userData.balance_ton) {
        userData.balance_ton = "0";
      }
      
      // Вставка в базу данных
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      
      console.log(`[UserService] Successfully created user: id=${user.id}, telegram_id=${user.telegram_id}, guest_id=${user.guest_id}, ref_code=${user.ref_code}`);
      
      return user;
    } catch (error) {
      console.error(`[UserService] Error creating user:`, error);
      throw new Error(`Failed to create user: ${(error as Error)?.message || 'Unknown database error'}`);
    }
  }

  /**
   * Обновляет данные пользователя
   * @param userId ID пользователя
   * @param userData Данные для обновления
   * @returns Обновленные данные пользователя
   */
  static async updateUser(userId: number, userData: any): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }
  
  /**
   * Обновляет баланс пользователя (специально для реферальной системы)
   * @param userId ID пользователя
   * @param balanceData Данные баланса для обновления
   * @returns Обновленные данные пользователя
   */
  static async updateUserBalance(userId: number, balanceData: {
    balance_uni?: string,
    balance_ton?: string
  }): Promise<User | undefined> {
    return this.updateUser(userId, balanceData);
  }

  /**
   * Получает пользователя по реферальному коду
   * @param refCode Реферальный код
   * @returns Данные пользователя или undefined
   */
  static async getUserByRefCode(refCode: string): Promise<User | undefined> {
    if (!refCode) {
      console.error('[UserService] Invalid ref_code: empty value');
      return undefined;
    }

    try {
      return await storage.getUserByRefCode(refCode);
    } catch (error) {
      console.error(`[UserService] Error retrieving user by ref_code ${refCode}:`, error);
      throw error;
    }
  }

  /**
   * Обновляет реферальный код пользователя
   * @param userId ID пользователя
   * @param refCode Новый реферальный код
   * @returns Обновленные данные пользователя
   */
  static async updateUserRefCode(userId: number, refCode: string): Promise<User | undefined> {
    if (!refCode) {
      console.error('[UserService] Invalid ref_code for update: empty value');
      return undefined;
    }

    try {
      return await storage.updateUserRefCode(userId, refCode);
    } catch (error) {
      console.error(`[UserService] Error updating ref_code for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Генерирует новый уникальный реферальный код
   * @returns Сгенерированный код
   */
  /**
   * Простая генерация реферального кода (без проверки на уникальность)
   * @deprecated Используйте generateUniqueRefCode() для гарантии уникальности кода
   */
  static generateRefCode(): string {
    console.warn('[UserService] ⚠️ Использование устаревшего метода generateRefCode(). Рекомендуется использовать generateUniqueRefCode()');
    return storage.generateRefCode();
  }
  
  /**
   * Генерирует гарантированно уникальный реферальный код
   * и проверяет его на отсутствие коллизий в базе данных
   * @returns Promise разрешающийся в уникальный реферальный код
   */
  static async generateUniqueRefCode(): Promise<string> {
    return await storage.generateUniqueRefCode();
  }
  
  /**
   * Проверяет уникальность реферального кода
   * @param refCode Реферальный код для проверки
   * @returns Promise разрешающийся в true, если код уникален
   */
  static async isRefCodeUnique(refCode: string): Promise<boolean> {
    return await storage.isRefCodeUnique(refCode);
  }

  /**
   * Получает пользователя по guest_id
   * @param guestId Уникальный идентификатор гостя
   * @returns Данные пользователя или undefined
   */
  static async getUserByGuestId(guestId: string): Promise<User | undefined> {
    console.log(`[UserService] Searching for user with guestId ${guestId}`);
    
    // Проверка на валидность ID
    if (!guestId || guestId.trim() === '') {
      console.error(`[UserService] Invalid guestId: ${guestId}`);
      return undefined;
    }
    
    try {
      return await storage.getUserByGuestId(guestId);
    } catch (error) {
      console.error(`[UserService] Error retrieving user by guestId ${guestId}:`, error);
      throw error;
    }
  }
}