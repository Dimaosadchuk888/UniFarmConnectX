import { authUsers, users, type AuthUser, type InsertAuthUser, type User } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<AuthUser | undefined>;
  getUserByUsername(username: string): Promise<AuthUser | undefined>;
  createUser(user: InsertAuthUser): Promise<AuthUser>;
  
  // Метод для получения пользователя из основной таблицы
  getUserById(id: number): Promise<User | undefined>;
  
  // Новые методы для работы с TON-адресом кошелька
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  updateUserWalletAddress(userId: number, walletAddress: string): Promise<User | undefined>;
  
  // Методы для работы с реферальным кодом
  generateRefCode(): string;
  generateUniqueRefCode(): Promise<string>;
  isRefCodeUnique(refCode: string): Promise<boolean>;
  getUserByRefCode(refCode: string): Promise<User | undefined>;
  updateUserRefCode(userId: number, refCode: string): Promise<User | undefined>;
  
  // Методы для работы с родительским реферальным кодом
  updateUserParentRefCode(userId: number, parentRefCode: string): Promise<User | undefined>;
  getUsersByParentRefCode(parentRefCode: string): Promise<User[]>;
  
  // Методы для работы с guest_id (Этап 3.1)
  generateGuestId(): string;
  getUserByGuestId(guestId: string): Promise<User | undefined>;
  
  // Методы для работы с Telegram
  getUserByTelegramId(telegramId: number): Promise<User | undefined>;
  createUserWithTelegram(userData: {
    telegram_id: number;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    balance: number;
    farming_rate: number;
    wallet_address: string | null;
    ref_code?: string;
    referrer_id: number | null;
    created_at: Date;
    updated_at: Date;
    guest_id?: string;
  }): Promise<User>;
  
  // Новый метод для создания пользователя в основной таблице users
  createMainUser(userData: {
    telegram_id: number;
    guest_id?: string; // Добавляем guest_id
    username?: string;
    balance_uni?: string;
    balance_ton?: string;
    ref_code?: string; // Делаем ref_code опциональным
    parent_ref_code?: string; // Добавляем поле parent_ref_code
    created_at?: Date;
  }): Promise<User>;
  
  // Создание пользователя только на основе guest_id (без Telegram)
  createGuestUser(userData: {
    guest_id: string;
    username?: string;
    balance_uni?: string;
    balance_ton?: string;
    ref_code?: string; // Делаем ref_code опциональным
    parent_ref_code?: string; // Добавляем parent_ref_code
    created_at?: Date;
  }): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    console.log('[Storage] Инициализация DatabaseStorage');
  }
  
  // Создание пользователя в таблице users для AirDrop и аутентификации
  async createMainUser(userData: {
    telegram_id: number;
    guest_id?: string; // Добавляем поддержку guest_id
    username?: string;
    balance_uni?: string;
    balance_ton?: string;
    ref_code?: string; // Делаем ref_code опциональным
    parent_ref_code?: string; // Добавляем поле parent_ref_code
    created_at?: Date;
  }): Promise<User> {
    // Генерируем guest_id, если он не был предоставлен
    const guestId = userData.guest_id || this.generateGuestId();
    
    // Проверяем, существует ли пользователь с таким guest_id
    const existingUser = await this.getUserByGuestId(guestId);
    if (existingUser) {
      console.log(`[Storage] Пользователь с guest_id ${guestId} уже существует, ID=${existingUser.id}`);
      
      // Если предоставлен parent_ref_code и у пользователя его еще нет, 
      // устанавливаем его для существующего пользователя
      if (userData.parent_ref_code && !existingUser.parent_ref_code) {
        console.log(`[Storage] Устанавливаем parent_ref_code ${userData.parent_ref_code} для существующего пользователя ID=${existingUser.id}`);
        
        // Проверяем, что родительский код не является кодом самого пользователя
        if (existingUser.ref_code === userData.parent_ref_code) {
          console.log(`[Storage] ⚠️ Попытка самореферрала для пользователя ID=${existingUser.id} предотвращена`);
          return existingUser;
        }
        
        // Проверяем, что родительский код существует в базе
        const parentUser = await this.getUserByRefCode(userData.parent_ref_code);
        if (!parentUser) {
          console.log(`[Storage] ⚠️ Пользователь с ref_code ${userData.parent_ref_code} не найден, связь не будет установлена`);
          return existingUser;
        }
        
        // Устанавливаем parent_ref_code
        const [updatedUser] = await db
          .update(users)
          .set({ parent_ref_code: userData.parent_ref_code })
          .where(eq(users.id, existingUser.id))
          .returning();
          
        console.log(`[Storage] Для пользователя ID=${existingUser.id} установлен parent_ref_code=${userData.parent_ref_code}`);
        return updatedUser;
      }
      
      return existingUser;
    }
    
    console.log(`[Storage] Создание пользователя в основной таблице users:`, {
      telegram_id: userData.telegram_id,
      guest_id: guestId,
      username: userData.username,
      parent_ref_code: userData.parent_ref_code
    });
    
    try {
      // Генерируем уникальный ref_code, если он не был предоставлен
      const refCode = userData.ref_code || await this.generateUniqueRefCode();
      
      // Проверяем parent_ref_code, если он предоставлен
      if (userData.parent_ref_code) {
        // Проверяем, что этот код не совпадает с ref_code пользователя
        if (refCode === userData.parent_ref_code) {
          console.log(`[Storage] ⚠️ Попытка самореферрала (ref_code = parent_ref_code) предотвращена`);
          userData.parent_ref_code = undefined; // Отключаем parent_ref_code
        } else {
          // Проверяем, что пользователь с таким реферальным кодом существует
          const parentUser = await this.getUserByRefCode(userData.parent_ref_code);
          if (!parentUser) {
            console.log(`[Storage] ⚠️ Пользователь с ref_code ${userData.parent_ref_code} не найден, связь не будет установлена`);
            userData.parent_ref_code = undefined; // Отключаем parent_ref_code
          } else {
            console.log(`[Storage] ✅ Пользователь с ref_code ${userData.parent_ref_code} найден (ID=${parentUser.id}), будет установлена реферальная связь`);
          }
        }
      }
      
      // Подготавливаем данные для вставки
      const insertData = {
        telegram_id: userData.telegram_id,
        guest_id: guestId,
        username: userData.username || `user_${userData.telegram_id}`,
        ref_code: refCode,
        parent_ref_code: userData.parent_ref_code, // Добавляем parent_ref_code
        balance_uni: userData.balance_uni || "100", // По умолчанию даем 100 UNI
        balance_ton: userData.balance_ton || "0",
        created_at: userData.created_at || new Date()
      };
      
      // Выполняем вставку
      const [user] = await db
        .insert(users)
        .values(insertData)
        .returning();
      
      if (userData.parent_ref_code) {
        console.log(`[Storage] Пользователь успешно создан в таблице users с реферальной связью: ID=${user.id}, telegram_id=${user.telegram_id}, guest_id=${user.guest_id}, ref_code=${user.ref_code}, parent_ref_code=${user.parent_ref_code}`);
      } else {
        console.log(`[Storage] Пользователь успешно создан в таблице users: ID=${user.id}, telegram_id=${user.telegram_id}, guest_id=${user.guest_id}, ref_code=${user.ref_code}`);
      }
      
      return user;
    } catch (error) {
      console.error(`[Storage] Ошибка при создании пользователя в таблице users:`, error);
      throw error;
    }
  }
  
  // Методы для работы с Telegram
  async getUserByTelegramId(telegramId: number): Promise<User | undefined> {
    console.log(`[Storage] Поиск пользователя по Telegram ID: ${telegramId}`);
    
    try {
      const [user] = await db.select().from(users).where(eq(users.telegram_id, telegramId));
      
      if (user) {
        console.log(`[Storage AUDIT] Найден пользователь по Telegram ID: ID=${user.id}, telegram_id=${user.telegram_id}`);
      } else {
        console.log(`[Storage AUDIT] Пользователь с Telegram ID ${telegramId} не найден в базе`);
      }
      
      return user;
    } catch (error) {
      console.error(`[Storage] Ошибка при поиске пользователя по Telegram ID ${telegramId}:`, error);
      return undefined;
    }
  }
  
  async createUserWithTelegram(userData: {
    telegram_id: number;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    balance: number;
    farming_rate: number;
    wallet_address: string | null;
    ref_code?: string; // Делаем ref_code опциональным
    referrer_id: number | null;
    created_at: Date;
    updated_at: Date;
    guest_id?: string; // Добавляем поддержку guest_id
  }): Promise<User> {
    console.log(`[Storage] Создание пользователя через Telegram: ${userData.telegram_id}`);
    
    try {
      // Если предоставлен guest_id, сначала ищем пользователя по guest_id
      if (userData.guest_id) {
        const userByGuestId = await this.getUserByGuestId(userData.guest_id);
        if (userByGuestId) {
          console.log(`[Storage] Найден пользователь по guest_id ${userData.guest_id}`);
          
          // Если у существующего пользователя нет telegram_id, обновляем его
          if (!userByGuestId.telegram_id) {
            console.log(`[Storage] Обновляем существующего пользователя, добавляя telegram_id: ${userData.telegram_id}`);
            const [updatedUser] = await db
              .update(users)
              .set({ telegram_id: userData.telegram_id })
              .where(eq(users.id, userByGuestId.id))
              .returning();
            
            return updatedUser;
          }
          
          // Проверяем, есть ли у пользователя ref_code
          if (!userByGuestId.ref_code) {
            // Если нет ref_code, генерируем новый и обновляем пользователя
            const newRefCode = await this.generateUniqueRefCode();
            console.log(`[Storage] Существующий пользователь не имеет ref_code. Генерируем новый: ${newRefCode}`);
            
            const [updatedUser] = await db
              .update(users)
              .set({ ref_code: newRefCode })
              .where(eq(users.id, userByGuestId.id))
              .returning();
              
            return updatedUser;
          }
          
          return userByGuestId;
        }
      }
      
      // Проверяем, существует ли уже пользователь с таким Telegram ID
      const existingUser = await this.getUserByTelegramId(userData.telegram_id);
      
      if (existingUser) {
        console.log(`[Storage] Пользователь с Telegram ID ${userData.telegram_id} уже существует`);
        
        // Если у существующего пользователя нет guest_id, но он был передан в этот метод,
        // обновляем запись пользователя, добавив guest_id
        if (!existingUser.guest_id && userData.guest_id) {
          console.log(`[Storage] Обновляем существующего пользователя, добавляя guest_id: ${userData.guest_id}`);
          const [updatedUser] = await db
            .update(users)
            .set({ guest_id: userData.guest_id })
            .where(eq(users.id, existingUser.id))
            .returning();
          
          return updatedUser;
        }
        
        // Проверяем, есть ли у пользователя ref_code
        if (!existingUser.ref_code) {
          // Если нет ref_code, генерируем новый и обновляем пользователя
          const newRefCode = await this.generateUniqueRefCode();
          console.log(`[Storage] Существующий пользователь не имеет ref_code. Генерируем новый: ${newRefCode}`);
          
          const [updatedUser] = await db
            .update(users)
            .set({ ref_code: newRefCode })
            .where(eq(users.id, existingUser.id))
            .returning();
            
          return updatedUser;
        }
        
        return existingUser;
      }
      
      // Генерируем уникальный ref_code, если он не был предоставлен
      const refCode = userData.ref_code || await this.generateUniqueRefCode();
      const guestId = userData.guest_id || this.generateGuestId();
      
      // Создаем нового пользователя
      const [user] = await db
        .insert(users)
        .values({
          telegram_id: userData.telegram_id,
          guest_id: guestId, // Используем предоставленный или новый guest_id
          username: userData.username, // Основной username для отображения
          wallet: null, // Поле wallet для совместимости
          ton_wallet_address: userData.wallet_address,
          ref_code: refCode, // Используем предоставленный или новый ref_code
          balance_uni: "100", // Начальный баланс 100 UNI
          balance_ton: "0", // Нулевой баланс TON
          uni_farming_rate: userData.farming_rate?.toString() || "0", // Преобразуем в строку
          created_at: userData.created_at
        })
        .returning();
      
      console.log(`[Storage] Пользователь через Telegram успешно создан: ID=${user.id}, telegram_id=${user.telegram_id}, guest_id=${user.guest_id}, ref_code=${user.ref_code}`);
      
      return user;
    } catch (error) {
      console.error(`[Storage] Ошибка при создании пользователя через Telegram ${userData.telegram_id}:`, error);
      throw error;
    }
  }
  
  async getUserById(id: number): Promise<User | undefined> {
    console.log(`[Storage] Получение пользователя по ID: ${id}`);
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error(`[Storage] Ошибка при получении пользователя по ID ${id}:`, error);
      return undefined;
    }
  }

  async getUser(id: number): Promise<AuthUser | undefined> {
    console.log(`[Storage] Получение auth пользователя по ID: ${id}`);
    try {
      const [user] = await db.select().from(authUsers).where(eq(authUsers.id, id));
      return user;
    } catch (error) {
      console.error(`[Storage] Ошибка при получении auth пользователя по ID ${id}:`, error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<AuthUser | undefined> {
    console.log(`[Storage] Получение auth пользователя по username: ${username}`);
    try {
      const [user] = await db.select().from(authUsers).where(eq(authUsers.username, username));
      return user;
    } catch (error) {
      console.error(`[Storage] Ошибка при получении auth пользователя по username ${username}:`, error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertAuthUser): Promise<AuthUser> {
    console.log(`[Storage] Создание auth пользователя: ${insertUser.username}`);
    try {
      const [user] = await db.insert(authUsers).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error(`[Storage] Ошибка при создании auth пользователя ${insertUser.username}:`, error);
      throw error;
    }
  }
  
  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    console.log(`[Storage] Поиск пользователя по адресу кошелька: ${walletAddress}`);
    
    try {
      const [user] = await db.select().from(users).where(eq(users.ton_wallet_address, walletAddress));
      
      // Для аудита добавляем подробное логирование
      if (user) {
        console.log(`[Storage AUDIT] Найден пользователь по адресу кошелька: ID=${user.id}, wallet_address=${user.ton_wallet_address}`);
      } else {
        console.log(`[Storage AUDIT] Пользователь с адресом кошелька ${walletAddress} не найден в базе`);
      }
      
      return user;
    } catch (error) {
      console.error(`[Storage] Ошибка при поиске пользователя по адресу кошелька ${walletAddress}:`, error);
      return undefined;
    }
  }
  
  async updateUserWalletAddress(userId: number, walletAddress: string): Promise<User | undefined> {
    console.log(`[Storage] Обновление адреса кошелька для пользователя ${userId}: ${walletAddress}`);
    
    try {
      // Получаем текущего пользователя для логирования
      const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
      
      if (!currentUser) {
        console.log(`[Storage] Пользователь с ID ${userId} не найден`);
        return undefined;
      }
      
      // Для аудита сохраняем предыдущее значение
      const oldWalletAddress = currentUser.ton_wallet_address;
      
      // Обновляем адрес кошелька
      const [updatedUser] = await db
        .update(users)
        .set({ ton_wallet_address: walletAddress })
        .where(eq(users.id, userId))
        .returning();
      
      console.log(`[Storage] Адрес кошелька для пользователя ${userId} успешно обновлен`);
      console.log(`[Storage AUDIT] Обновлен адрес кошелька для пользователя ${userId}:`);
      console.log(`[Storage AUDIT]   Было: ${oldWalletAddress || 'null'}`);
      console.log(`[Storage AUDIT]   Стало: ${walletAddress}`);
      
      return updatedUser;
    } catch (error) {
      console.error(`[Storage] Ошибка при обновлении адреса кошелька пользователя ${userId}:`, error);
      return undefined;
    }
  }
  
  // Методы для работы с guest_id
  
  // Генерирует уникальный guest_id на основе UUID v4
  generateGuestId(): string {
    // UUID v4 для большей уникальности и безопасности
    const uuid = crypto.randomUUID();
    console.log(`[Storage] Сгенерирован новый guest_id (UUID v4): ${uuid}`);
    return uuid;
  }
  
  // Получает пользователя по guest_id
  async getUserByGuestId(guestId: string): Promise<User | undefined> {
    console.log(`[Storage] Поиск пользователя по guest_id: ${guestId}`);
    
    try {
      const [user] = await db.select().from(users).where(eq(users.guest_id, guestId));
      
      if (user) {
        console.log(`[Storage AUDIT] Найден пользователь по guest_id: ID=${user.id}, guest_id=${user.guest_id}`);
      } else {
        console.log(`[Storage AUDIT] Пользователь с guest_id ${guestId} не найден в базе`);
      }
      
      return user;
    } catch (error) {
      console.error(`[Storage] Ошибка при поиске пользователя по guest_id ${guestId}:`, error);
      return undefined;
    }
  }
  
  // Метод createGuestUserLegacy удален в рамках Этапа 10 (финальная зачистка)
  
  // Методы для работы с ref_code
  
  // Генерирует уникальный реферальный код
  generateRefCode(): string {
    // Набор символов, из которых будет формироваться реферальный код
    // Исключаем символы, которые могут быть неоднозначно восприняты: 0, O, 1, I, l
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    
    // Генерируем 8 символов - компромисс между длиной и надежностью
    // 8 символов из 32 возможных = 32^8 = 1,099,511,627,776 возможных комбинаций
    const length = 8;
    
    // Используем crypto.randomBytes для криптографически стойкой генерации
    const randomBytes = crypto.randomBytes(length);
    
    // Преобразуем байты в символы из нашего набора
    let refCode = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = randomBytes[i] % chars.length;
      refCode += chars[randomIndex];
    }
    
    console.log(`[Storage] Сгенерирован новый реферальный код: ${refCode}`);
    return refCode;
  }
  
  // Проверяет уникальность реферального кода
  async isRefCodeUnique(refCode: string): Promise<boolean> {
    const existingUser = await this.getUserByRefCode(refCode);
    return !existingUser;
  }
  
  // Генерирует гарантированно уникальный реферальный код
  async generateUniqueRefCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10; // Ограничиваем количество попыток
    
    while (attempts < maxAttempts) {
      const refCode = this.generateRefCode();
      
      // Проверяем уникальность
      const isUnique = await this.isRefCodeUnique(refCode);
      
      if (isUnique) {
        console.log(`[Storage] Подтверждена уникальность реферального кода: ${refCode}`);
        return refCode;
      }
      
      console.log(`[Storage] Реферальный код ${refCode} уже существует, генерируем новый. Попытка ${attempts + 1} из ${maxAttempts}`);
      attempts++;
    }
    
    // Если после максимального количества попыток не нашли уникальный код,
    // генерируем более длинный код для увеличения вероятности уникальности
    const extendedRefCode = this.generateRefCode() + this.generateRefCode().substring(0, 4);
    console.log(`[Storage] Сгенерирован расширенный реферальный код: ${extendedRefCode}`);
    return extendedRefCode;
  }
  
  // Получает пользователя по реферальному коду
  async getUserByRefCode(refCode: string): Promise<User | undefined> {
    console.log(`[Storage] Поиск пользователя по реферальному коду: ${refCode}`);
    
    try {
      const [user] = await db.select().from(users).where(eq(users.ref_code, refCode));
      
      if (user) {
        console.log(`[Storage AUDIT] Найден пользователь по реферальному коду: ID=${user.id}, ref_code=${user.ref_code}`);
      } else {
        console.log(`[Storage AUDIT] Пользователь с реферальным кодом ${refCode} не найден в базе`);
      }
      
      return user;
    } catch (error) {
      console.error(`[Storage] Ошибка при поиске пользователя по реферальному коду ${refCode}:`, error);
      return undefined;
    }
  }
  
  // Обновляет реферальный код пользователя
  async updateUserRefCode(userId: number, refCode: string): Promise<User | undefined> {
    console.log(`[Storage] Обновление реферального кода для пользователя ${userId}: ${refCode}`);
    
    try {
      // Получаем текущего пользователя для логирования
      const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
      
      if (!currentUser) {
        console.log(`[Storage] Пользователь с ID ${userId} не найден`);
        return undefined;
      }
      
      // Для аудита сохраняем предыдущее значение
      const oldRefCode = currentUser.ref_code;
      
      // Обновляем реферальный код
      const [updatedUser] = await db
        .update(users)
        .set({ ref_code: refCode })
        .where(eq(users.id, userId))
        .returning();
      
      console.log(`[Storage] Реферальный код для пользователя ${userId} успешно обновлен`);
      console.log(`[Storage AUDIT] Обновлен реферальный код для пользователя ${userId}:`);
      console.log(`[Storage AUDIT]   Было: ${oldRefCode || 'null'}`);
      console.log(`[Storage AUDIT]   Стало: ${refCode}`);
      
      return updatedUser;
    } catch (error) {
      console.error(`[Storage] Ошибка при обновлении реферального кода пользователя ${userId}:`, error);
      return undefined;
    }
  }
  
  // Обновляет родительский реферальный код пользователя (только если его ещё нет)
  async updateUserParentRefCode(userId: number, parentRefCode: string): Promise<User | undefined> {
    console.log(`[Storage] Обновление родительского реферального кода для пользователя ${userId}: ${parentRefCode}`);
    
    try {
      // Получаем текущего пользователя для проверки
      const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
      
      if (!currentUser) {
        console.log(`[Storage] Пользователь с ID ${userId} не найден`);
        return undefined;
      }
      
      // Проверяем, является ли этот ref_code кодом самого пользователя (предотвращение самореферрала)
      if (currentUser.ref_code === parentRefCode) {
        console.log(`[Storage] ⚠️ Попытка самореферрала для пользователя ${userId} с кодом ${parentRefCode} предотвращена`);
        return currentUser; // Возвращаем текущего пользователя без изменений
      }
      
      // Проверяем, есть ли уже родительский реферальный код
      if (currentUser.parent_ref_code) {
        console.log(`[Storage] Пользователь ${userId} уже имеет родительский реферальный код: ${currentUser.parent_ref_code}`);
        console.log(`[Storage] Новый код ${parentRefCode} игнорируется согласно требованиям ТЗ`);
        return currentUser; // Возвращаем текущего пользователя без изменений
      }
      
      // Проверяем, существует ли пользователь с таким реферальным кодом
      const parentUser = await this.getUserByRefCode(parentRefCode);
      if (!parentUser) {
        console.log(`[Storage] ⚠️ Пользователь с реферальным кодом ${parentRefCode} не найден в базе`);
        return currentUser; // Возвращаем текущего пользователя без изменений
      }
      
      // Обновляем родительский реферальный код
      const [updatedUser] = await db
        .update(users)
        .set({ parent_ref_code: parentRefCode })
        .where(eq(users.id, userId))
        .returning();
      
      console.log(`[Storage] Родительский реферальный код для пользователя ${userId} успешно установлен: ${parentRefCode}`);
      console.log(`[Storage AUDIT] Установлен родительский реферальный код для пользователя ${userId}:`);
      console.log(`[Storage AUDIT]   Было: ${currentUser.parent_ref_code || 'null'}`);
      console.log(`[Storage AUDIT]   Стало: ${parentRefCode}`);
      console.log(`[Storage AUDIT]   Parent User ID: ${parentUser.id}`);
      
      return updatedUser;
    } catch (error) {
      console.error(`[Storage] Ошибка при обновлении родительского реферального кода пользователя ${userId}:`, error);
      return undefined;
    }
  }
  
  // Получает пользователей по родительскому реферальному коду
  async getUsersByParentRefCode(parentRefCode: string): Promise<User[]> {
    console.log(`[Storage] Получение пользователей с родительским реферальным кодом: ${parentRefCode}`);
    
    try {
      const referrals = await db
        .select()
        .from(users)
        .where(eq(users.parent_ref_code, parentRefCode));
      
      console.log(`[Storage] Найдено ${referrals.length} пользователей с родительским реферальным кодом ${parentRefCode}`);
      
      return referrals;
    } catch (error) {
      console.error(`[Storage] Ошибка при получении пользователей с родительским реферальным кодом ${parentRefCode}:`, error);
      return [];
    }
  }
  
  // Создание пользователя только на основе guest_id (без Telegram) для Этапа 4 и 5
  // Этот метод обновлен для соответствия требованиям Этапа 5: безопасное восстановление пользователя
  async createGuestUser(userData: {
    guest_id: string;
    username?: string;
    balance_uni?: string;
    balance_ton?: string;
    ref_code?: string;
    parent_ref_code?: string;
    created_at?: Date;
  }): Promise<User> {
    console.log(`[Storage] Создание нового пользователя в режиме AirDrop с guest_id: ${userData.guest_id}`);
    
    try {
      // Проверяем, существует ли уже пользователь с таким guest_id
      const existingUser = await this.getUserByGuestId(userData.guest_id);
      
      if (existingUser) {
        console.log(`[Storage] Пользователь с guest_id ${userData.guest_id} уже существует`);
        
        // Если предоставлен parent_ref_code и у пользователя его еще нет, 
        // устанавливаем его для существующего пользователя
        if (userData.parent_ref_code && !existingUser.parent_ref_code) {
          console.log(`[Storage] Устанавливаем parent_ref_code ${userData.parent_ref_code} для существующего пользователя ID=${existingUser.id}`);
          
          // Проверяем, что родительский код не является кодом самого пользователя
          if (existingUser.ref_code === userData.parent_ref_code) {
            console.log(`[Storage] ⚠️ Попытка самореферрала для пользователя ID=${existingUser.id} предотвращена`);
            return existingUser;
          }
          
          // Проверяем, что родительский код существует в базе
          const parentUser = await this.getUserByRefCode(userData.parent_ref_code);
          if (!parentUser) {
            console.log(`[Storage] ⚠️ Пользователь с ref_code ${userData.parent_ref_code} не найден, связь не будет установлена`);
            return existingUser;
          }
          
          // Устанавливаем parent_ref_code
          const [updatedUser] = await db
            .update(users)
            .set({ parent_ref_code: userData.parent_ref_code })
            .where(eq(users.id, existingUser.id))
            .returning();
          
          console.log(`[Storage] Родительский реферальный код для пользователя ID=${existingUser.id} успешно установлен: ${userData.parent_ref_code}`);
          return updatedUser;
        }
        
        return existingUser;
      }
      
      // Если пользователь не существует, создаем нового
      console.log(`[Storage] Создание нового пользователя в режиме AirDrop`);
      
      // Генерируем ref_code, если не предоставлен
      const refCode = userData.ref_code || await this.generateUniqueRefCode();
      
      // Проверяем parent_ref_code, если он предоставлен
      let parentRefCode = null;
      if (userData.parent_ref_code) {
        // Проверяем, что родительский код существует в базе
        const parentUser = await this.getUserByRefCode(userData.parent_ref_code);
        if (parentUser) {
          parentRefCode = userData.parent_ref_code;
          console.log(`[Storage] Установлен родительский реферальный код: ${parentRefCode}`);
        } else {
          console.log(`[Storage] ⚠️ Родительский реферальный код ${userData.parent_ref_code} не найден, будет проигнорирован`);
        }
      }
      
      // Создаем нового пользователя
      const [user] = await db
        .insert(users)
        .values({
          guest_id: userData.guest_id,
          username: userData.username || `user_${Math.floor(Math.random() * 100000)}`,
          balance_uni: userData.balance_uni || '100',
          balance_ton: userData.balance_ton || '0',
          ref_code: refCode,
          parent_ref_code: parentRefCode,
          created_at: userData.created_at || new Date(),
          // Для AirDrop режима telegram_id не устанавливается
        })
        .returning();
      
      // Логируем результат
      if (parentRefCode) {
        console.log(`[Storage] Пользователь успешно создан в режиме AirDrop с реферальной связью: ID=${user.id}, guest_id=${user.guest_id}, ref_code=${user.ref_code}, parent_ref_code=${user.parent_ref_code}`);
      } else {
        console.log(`[Storage] Пользователь успешно создан в режиме AirDrop: ID=${user.id}, guest_id=${user.guest_id}, ref_code=${user.ref_code}`);
      }
      
      return user;
    } catch (error) {
      console.error(`[Storage] Ошибка при создании пользователя в режиме AirDrop:`, error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
