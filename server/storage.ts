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
  getUserByRefCode(refCode: string): Promise<User | undefined>;
  updateUserRefCode(userId: number, refCode: string): Promise<User | undefined>;
  
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
    ref_code: string;
    referrer_id: number | null;
    created_at: Date;
    updated_at: Date;
  }): Promise<User>;
  
  // Новый метод для создания пользователя в основной таблице users
  createMainUser(userData: {
    telegram_id: number;
    username?: string;
    balance_uni?: string;
    balance_ton?: string;
    ref_code: string;
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
    username?: string;
    balance_uni?: string;
    balance_ton?: string;
    ref_code: string;
    created_at?: Date;
  }): Promise<User> {
    console.log(`[Storage] Создание пользователя в основной таблице users:`, {
      telegram_id: userData.telegram_id,
      username: userData.username,
      ref_code: userData.ref_code
    });
    
    try {
      // Подготавливаем данные для вставки
      const insertData = {
        telegram_id: userData.telegram_id,
        username: userData.username || `user_${userData.telegram_id}`,
        ref_code: userData.ref_code,
        balance_uni: userData.balance_uni || "100", // По умолчанию даем 100 UNI
        balance_ton: userData.balance_ton || "0",
        created_at: userData.created_at || new Date()
      };
      
      // Выполняем вставку
      const [user] = await db
        .insert(users)
        .values(insertData)
        .returning();
      
      console.log(`[Storage] Пользователь успешно создан в таблице users: ID=${user.id}, telegram_id=${user.telegram_id}, ref_code=${user.ref_code}`);
      
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
    ref_code: string;
    referrer_id: number | null;
    created_at: Date;
    updated_at: Date;
  }): Promise<User> {
    console.log(`[Storage] Создание пользователя через Telegram: ${userData.telegram_id}`);
    
    try {
      // Проверяем, существует ли уже пользователь с таким Telegram ID
      const existingUser = await this.getUserByTelegramId(userData.telegram_id);
      
      if (existingUser) {
        console.log(`[Storage] Пользователь с Telegram ID ${userData.telegram_id} уже существует`);
        return existingUser;
      }
      
      // Создаем нового пользователя
      const [user] = await db
        .insert(users)
        .values({
          telegram_id: userData.telegram_id,
          username: userData.username, // Основной username для отображения
          wallet: null, // Поле wallet для совместимости
          ton_wallet_address: userData.wallet_address,
          ref_code: userData.ref_code,
          balance_uni: "0", // Нулевой баланс UNI
          balance_ton: "0", // Нулевой баланс TON
          uni_farming_rate: userData.farming_rate.toString(), // Преобразуем в строку
          created_at: userData.created_at
        })
        .returning();
      
      console.log(`[Storage] Пользователь через Telegram успешно создан: ID=${user.id}, telegram_id=${user.telegram_id}`);
      
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
  
  // Методы для работы с ref_code
  
  // Генерирует уникальный реферальный код
  generateRefCode(): string {
    // Генерируем случайную строку из 12 символов для большей уникальности
    const randomBytes = crypto.randomBytes(6);
    const refCode = randomBytes.toString('hex').slice(0, 12);
    console.log(`[Storage] Сгенерирован новый реферальный код: ${refCode}`);
    return refCode;
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
}

export const storage = new DatabaseStorage();
