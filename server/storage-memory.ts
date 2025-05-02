// Временная реализация хранилища в памяти для работы без базы данных
import { users, type User, type InsertUser } from "../shared/schema";
import { eq } from "drizzle-orm";

// Интерфейс хранилища (IStorage)
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGuestId(guestId: string): Promise<User | undefined>;
  getUserByRefCode(refCode: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUserRefCode(userId: number, refCode: string): Promise<User | undefined>;
  generateRefCode(): string;
  generateUniqueRefCode(): Promise<string>;
  isRefCodeUnique(refCode: string): Promise<boolean>;
}

// Временное хранилище в памяти
export class MemStorage implements IStorage {
  private users: User[] = [];
  private nextId = 1;

  async getUser(id: number): Promise<User | undefined> {
    console.log('[MemStorage] Получение пользователя по ID:', id);
    return this.users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log('[MemStorage] Получение пользователя по имени:', username);
    return this.users.find(user => user.username === username);
  }

  async getUserByGuestId(guestId: string): Promise<User | undefined> {
    console.log('[MemStorage] Получение пользователя по guest_id:', guestId);
    return this.users.find(user => user.guest_id === guestId);
  }
  
  async getUserByRefCode(refCode: string): Promise<User | undefined> {
    console.log('[MemStorage] Получение пользователя по ref_code:', refCode);
    return this.users.find(user => user.ref_code === refCode);
  }
  
  async updateUserRefCode(userId: number, refCode: string): Promise<User | undefined> {
    console.log(`[MemStorage] Обновление ref_code для пользователя ID: ${userId}, новый код: ${refCode}`);
    const userIndex = this.users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      return undefined;
    }
    
    this.users[userIndex] = {
      ...this.users[userIndex],
      ref_code: refCode
    };
    
    return this.users[userIndex];
  }
  
  generateRefCode(): string {
    console.log('[MemStorage] Генерация реферального кода');
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  }
  
  async generateUniqueRefCode(): Promise<string> {
    console.log('[MemStorage] Генерация уникального реферального кода');
    let refCode = this.generateRefCode();
    let isUnique = await this.isRefCodeUnique(refCode);
    
    // Пробуем до 10 раз сгенерировать уникальный код
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      refCode = this.generateRefCode();
      isUnique = await this.isRefCodeUnique(refCode);
      attempts++;
    }
    
    return refCode;
  }
  
  async isRefCodeUnique(refCode: string): Promise<boolean> {
    console.log(`[MemStorage] Проверка уникальности ref_code: ${refCode}`);
    const existingUser = await this.getUserByRefCode(refCode);
    return !existingUser;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log('[MemStorage] Создание нового пользователя:', insertUser);
    const id = this.nextId++;
    const createdAt = new Date();
    
    // Создаем нового пользователя согласно схеме
    const newUser: User = {
      id,
      telegram_id: insertUser.telegram_id || null,
      guest_id: insertUser.guest_id || null,
      username: insertUser.username || `user${id}`,
      wallet: insertUser.wallet || null,
      ton_wallet_address: insertUser.ton_wallet_address || null,
      ref_code: insertUser.ref_code || `REF${id.toString().padStart(6, '0')}`,
      parent_ref_code: insertUser.parent_ref_code || null,
      balance_uni: "0",
      balance_ton: "0",
      uni_deposit_amount: "0",
      uni_farming_start_timestamp: null,
      uni_farming_balance: "0",
      uni_farming_rate: "0",
      uni_farming_last_update: null,
      created_at: createdAt,
      checkin_last_date: null,
      checkin_streak: 0
    };
    
    this.users.push(newUser);
    return newUser;
  }
}

// Экспортируем экземпляр хранилища с фиктивными данными
export const storage = new MemStorage();