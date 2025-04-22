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
}

export class DatabaseStorage implements IStorage {
  constructor() {
    console.log('[Storage] Инициализация DatabaseStorage');
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
