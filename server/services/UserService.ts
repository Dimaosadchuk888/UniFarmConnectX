/**
 * Сервис для работы с пользователями
 * 
 * Добавляет бизнес-логику над операциями хранилища данных.
 * Сервисы являются основными компонентами для использования в контроллерах API.
 */

import { IStorage, StorageErrors } from '../storage-interface';
import { User, InsertUser } from '@shared/schema';
import { generateRandomString } from '../utils/string-utils';

/**
 * Опции для создания пользователя
 */
export interface CreateUserOptions {
  username?: string;
  telegramId?: number;
  guestId?: string;
  parentRefCode?: string;
  refCode?: string;
}

/**
 * Сервис для работы с пользователями
 */
export class UserService {
  constructor(private storage: IStorage) {}
  
  /**
   * Получение пользователя по ID
   * @param id ID пользователя
   * @returns Promise<User> Объект пользователя
   * @throws {StorageError} если пользователь не найден
   */
  async getUserById(id: number): Promise<User> {
    const user = await this.storage.getUser(id);
    
    if (!user) {
      throw StorageErrors.notFound('User', { id });
    }
    
    return user;
  }
  
  /**
   * Получение пользователя по имени
   * @param username Имя пользователя
   * @returns Promise<User> Объект пользователя
   * @throws {StorageError} если пользователь не найден
   */
  async getUserByUsername(username: string): Promise<User> {
    const user = await this.storage.getUserByUsername(username);
    
    if (!user) {
      throw StorageErrors.notFound('User', { username });
    }
    
    return user;
  }
  
  /**
   * Получение пользователя по гостевому ID
   * @param guestId Гостевой ID
   * @returns Promise<User | undefined> Объект пользователя или undefined, если не найден
   */
  async getUserByGuestId(guestId: string): Promise<User | undefined> {
    console.log(`[UserService] Запрос пользователя по guest_id: ${guestId}`);
    return this.storage.getUserByGuestId(guestId);
  }
  
  /**
   * Получение пользователя по реферальному коду
   * @param refCode Реферальный код
   * @returns Promise<User | undefined> Объект пользователя или undefined, если не найден
   */
  async getUserByRefCode(refCode: string): Promise<User | undefined> {
    console.log(`[UserService] Запрос пользователя по ref_code: ${refCode}`);
    return this.storage.getUserByRefCode(refCode);
  }
  
  /**
   * Создание нового пользователя
   * @param options Опции для создания пользователя
   * @returns Promise<User> Созданный пользователь
   */
  async createUser(options: CreateUserOptions): Promise<User> {
    // Валидация данных
    if (options.telegramId) {
      const existingByTelegramId = await this.storage.getUserByUsername(`telegram_${options.telegramId}`);
      if (existingByTelegramId) {
        throw StorageErrors.duplicate('User', 'telegram_id', options.telegramId);
      }
    }
    
    if (options.guestId) {
      const existingByGuestId = await this.storage.getUserByGuestId(options.guestId);
      if (existingByGuestId) {
        throw StorageErrors.duplicate('User', 'guest_id', options.guestId);
      }
    }
    
    // Генерация имени пользователя, если не указано
    const username = options.username || 
                     (options.telegramId ? `telegram_${options.telegramId}` : 
                     (options.guestId ? `guest_${options.guestId.substring(0, 8)}` : 
                     `user_${generateRandomString(8)}`));
    
    // Проверка родительского реферального кода
    let parentUser;
    if (options.parentRefCode) {
      parentUser = await this.storage.getUserByRefCode(options.parentRefCode);
      if (!parentUser) {
        console.warn(`[UserService] Указан несуществующий родительский реферальный код: ${options.parentRefCode}`);
        options.parentRefCode = undefined;
      }
    }
    
    // Генерация уникального реферального кода
    const refCode = options.refCode || await this.storage.generateUniqueRefCode();
    
    // Создание пользователя
    const newUser: InsertUser = {
      username,
      telegram_id: options.telegramId || null,
      guest_id: options.guestId || null,
      ref_code: refCode,
      parent_ref_code: options.parentRefCode || null
    };
    
    console.log(`[UserService] Создание нового пользователя:`, newUser);
    const user = await this.storage.createUser(newUser);
    
    // Дополнительные действия после создания пользователя
    console.log(`[UserService] Пользователь успешно создан с ID: ${user.id} и ref_code: ${user.ref_code}`);
    
    // Если был указан родительский реферальный код, создаем реферальную запись
    if (parentUser && 'createReferral' in this.storage) {
      try {
        const extendedStorage = this.storage as any;
        await extendedStorage.createReferral({
          user_id: user.id,
          inviter_id: parentUser.id,
          level: 1,
          reward_uni: "0",
          ref_path: [parentUser.id]
        });
        console.log(`[UserService] Реферальная запись для пользователя ${user.id} и пригласителя ${parentUser.id} успешно создана`);
      } catch (error) {
        console.error(`[UserService] Ошибка при создании реферальной записи:`, error);
      }
    }
    
    return user;
  }
  
  /**
   * Обновление реферального кода пользователя
   * @param userId ID пользователя
   * @param newRefCode Новый реферальный код
   * @returns Promise<User> Обновленный пользователь
   * @throws {StorageError} если пользователь не найден или код не уникален
   */
  async updateRefCode(userId: number, newRefCode: string): Promise<User> {
    // Проверяем существование пользователя
    const user = await this.storage.getUser(userId);
    if (!user) {
      throw StorageErrors.notFound('User', { id: userId });
    }
    
    // Проверяем уникальность кода
    const isUnique = await this.storage.isRefCodeUnique(newRefCode);
    if (!isUnique) {
      throw StorageErrors.duplicate('User', 'ref_code', newRefCode);
    }
    
    // Обновляем код
    const updatedUser = await this.storage.updateUserRefCode(userId, newRefCode);
    if (!updatedUser) {
      throw StorageErrors.database('Failed to update user ref code');
    }
    
    return updatedUser;
  }
  
  /**
   * Создание гостевого пользователя
   * @param guestId Гостевой ID (необязательно, генерируется если не указан)
   * @param parentRefCode Реферальный код пригласителя (необязательно)
   * @returns Promise<User> Созданный пользователь
   */
  async createGuestUser(guestId?: string, parentRefCode?: string): Promise<User> {
    const finalGuestId = guestId || generateRandomString(36);
    
    return this.createUser({
      guestId: finalGuestId,
      parentRefCode
    });
  }
}

// Экспортируем фабричную функцию для создания экземпляра сервиса
export function createUserService(storage: IStorage): UserService {
  return new UserService(storage);
}