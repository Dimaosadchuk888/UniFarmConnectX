import { db } from '../db';
import { users, User } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from '../storage';
import * as crypto from 'crypto';
import { NotFoundError } from '../middleware/errorHandler';

// Определяем интерфейс для данных баланса пользователя
export interface UserBalanceInfo {
  balance_uni: string;
  balance_ton: string;
  username: string;
  telegram_id: number | null;
  ref_code: string;
}

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
   * @throws Error при ошибке базы данных
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
  
  /**
   * Получает баланс пользователя
   * @param userId ID пользователя
   * @returns Объект с балансами пользователя
   * @throws NotFoundError если пользователь не найден
   */
  static async getUserBalanceById(userId: number): Promise<UserBalanceInfo> {
    const user = await this.getUserById(userId);
    
    if (!user) {
      throw new NotFoundError(`Пользователь с ID ${userId} не найден`);
    }
    
    return {
      balance_uni: String(user.balance_uni || '0.000000'),
      balance_ton: String(user.balance_ton || '0.000000'),
      username: user.username,
      telegram_id: user.telegram_id,
      ref_code: typeof user.ref_code === 'string' ? user.ref_code : ''
    };
  }
  
  /**
   * Обрабатывает Telegram InitData, определяет пользователя или создает нового
   * @param telegramInitData Данные инициализации от Telegram
   * @param guestId Идентификатор гостя (опционально)
   * @param refInviterId ID пригласившего пользователя (опционально)
   * @param refCode Реферальный код (опционально)
   * @returns Объект с информацией о пользователе и его статусе
   */
  static async processUserIdentification(
    telegramInitData: string | undefined,
    guestId: string | undefined,
    refInviterId: number | null = null,
    refCode: string | null = null
  ): Promise<{
    user: User;
    isNewUser: boolean;
    source: 'telegram' | 'guest_id' | 'session' | 'created';
    telegramId: number | null;
    username: string | null;
  }> {
    let user: User | undefined;
    let isNewUser = false;
    let source: 'telegram' | 'guest_id' | 'session' | 'created' = 'created';
    let telegramId: number | null = null;
    let username: string | null = null;
    let firstName: string | null = null;
    let lastName: string | null = null;
    
    // 1. Проверяем данные Telegram, если они есть
    if (telegramInitData) {
      try {
        // Здесь должна быть проверка данных Telegram через validateTelegramInitData
        // В этом рефакторинге мы не изменяем эту логику, она остается в контроллере
        console.log('[UserService] processUserIdentification: telegramInitData provided, validation should be done in controller');
      } catch (error) {
        console.error('[UserService] Error processing Telegram data:', error);
      }
    }
    
    // 2. Ищем пользователя по guestId, если он предоставлен
    if (!user && guestId) {
      user = await this.getUserByGuestId(guestId);
      if (user) {
        source = 'guest_id';
        console.log(`[UserService] Found user by guest_id: ${user.id}`);
      }
    }
    
    // 3. Если пользователь всё еще не найден, создаем нового
    if (!user) {
      // Создаем нового пользователя
      const newUserData: any = {
        telegram_id: telegramId,
        username: username || `guest_${Date.now()}`,
        first_name: firstName,
        last_name: lastName,
        guest_id: guestId || crypto.randomUUID(),
        ref_code: null, // Будет сгенерирован в createUser
        parent_ref_code: refCode,
        parent_id: refInviterId
      };
      
      user = await this.createUser(newUserData);
      isNewUser = true;
      source = 'created';
      console.log(`[UserService] Created new user: ${user.id}`);
    }
    
    return {
      user,
      isNewUser,
      source,
      telegramId,
      username
    };
  }

  /**
   * Регистрирует нового пользователя в гостевом режиме
   * @param guestId Идентификатор гостя
   * @param referrerCode Реферальный код пригласившего (опционально)
   * @param airdropMode Режим AirDrop (опционально)
   * @returns Объект с информацией о зарегистрированном пользователе
   */
  static async registerGuestUser(
    guestId: string,
    referrerCode: string | null = null,
    airdropMode: boolean = false
  ): Promise<{
    id: number;
    username: string;
    ref_code: string;
    telegram_id: number | null;
    telegram_username: string | null;
    guest_id: string;
    created_at: string | Date;
    referrer_id: number | null;
    message?: string;
  }> {
    console.log(`[UserService] Registering guest user with guestId: ${guestId}, referrerCode: ${referrerCode}, airdropMode: ${airdropMode}`);
    
    // Проверяем, существует ли уже пользователь с таким guestId
    const existingUser = await this.getUserByGuestId(guestId);
    if (existingUser) {
      console.log(`[UserService] User with guestId ${guestId} already exists: ${existingUser.id}`);
      return {
        id: existingUser.id,
        username: existingUser.username || `guest_${existingUser.id}`,
        ref_code: existingUser.ref_code || '',
        telegram_id: existingUser.telegram_id,
        telegram_username: existingUser.username || null,
        guest_id: guestId,
        created_at: existingUser.created_at || new Date(),
        referrer_id: existingUser.parent_id || null,
        message: 'Пользователь уже существует'
      };
    }
    
    // Создаем нового пользователя
    let referrerId: number | null = null;
    
    // Если предоставлен реферальный код, пытаемся найти пригласителя
    if (referrerCode) {
      const inviter = await this.getUserByRefCode(referrerCode);
      if (inviter) {
        referrerId = inviter.id;
      }
    }
    
    const newUserData: any = {
      telegram_id: null,
      username: `guest_${Date.now()}`,
      guest_id: guestId,
      ref_code: null, // Будет сгенерирован автоматически
      parent_ref_code: referrerCode,
      parent_id: referrerId
    };
    
    const newUser = await this.createUser(newUserData);
    
    return {
      id: newUser.id,
      username: newUser.username || `guest_${newUser.id}`,
      ref_code: newUser.ref_code || '',
      telegram_id: newUser.telegram_id,
      telegram_username: newUser.username || null,
      guest_id: guestId,
      created_at: newUser.created_at || new Date(),
      referrer_id: newUser.parent_id || null,
      message: 'Пользователь успешно зарегистрирован'
    };
  }

  /**
   * Восстанавливает сессию пользователя
   * @param guestId Идентификатор гостя (опционально)
   * @param telegramData Данные от Telegram (опционально)
   * @returns Объект с информацией о пользователе и сессии
   */
  static async restoreSession(
    guestId?: string,
    telegramData?: any
  ): Promise<{
    user: User;
    session_id: string;
    is_new_user: boolean;
    message?: string;
  }> {
    console.log(`[UserService] Restoring session for guestId: ${guestId || 'not provided'}, telegramData: ${telegramData ? 'provided' : 'not provided'}`);
    
    let user: User | undefined;
    let isNewUser = false;
    
    // Сначала пробуем найти пользователя по гостевому ID
    if (guestId) {
      user = await this.getUserByGuestId(guestId);
      
      if (user) {
        console.log(`[UserService] Found user by guestId: ${user.id}`);
      }
    }
    
    // Если не нашли по гостевому ID, и есть данные Telegram, пробуем найти или создать
    if (!user && telegramData) {
      // Здесь должна быть проверка и обработка данных Telegram
      // Предполагаем, что telegramData содержит id пользователя
      try {
        if (telegramData.id) {
          const telegramId = Number(telegramData.id);
          user = await this.getUserByTelegramId(telegramId);
          
          if (user) {
            console.log(`[UserService] Found user by telegramId: ${user.id}`);
          } else {
            // Создаем нового пользователя с данными из Telegram
            const newUserData: any = {
              telegram_id: telegramId,
              username: telegramData.username || `telegram_${telegramId}`,
              first_name: telegramData.first_name,
              last_name: telegramData.last_name,
              guest_id: guestId || crypto.randomUUID(),
              ref_code: null // Будет сгенерирован автоматически
            };
            
            user = await this.createUser(newUserData);
            isNewUser = true;
            console.log(`[UserService] Created new user from Telegram data: ${user.id}`);
          }
        }
      } catch (error) {
        console.error('[UserService] Error processing Telegram data:', error);
      }
    }
    
    // Если пользователь все еще не найден, создаем нового гостевого пользователя
    if (!user) {
      const newGuestId = guestId || crypto.randomUUID();
      const newUserData: any = {
        telegram_id: null,
        username: `guest_${Date.now()}`,
        guest_id: newGuestId,
        ref_code: null // Будет сгенерирован автоматически
      };
      
      user = await this.createUser(newUserData);
      isNewUser = true;
      console.log(`[UserService] Created new guest user: ${user.id}`);
    }
    
    // Генерируем идентификатор сессии
    const sessionId = `sess_${crypto.randomUUID()}`;
    
    return {
      user,
      session_id: sessionId,
      is_new_user: isNewUser,
      message: isNewUser ? 'Создан новый пользователь' : 'Восстановлена сессия существующего пользователя'
    };
  }
}