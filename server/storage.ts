import { authUsers, users, type AuthUser, type InsertAuthUser, type User } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<AuthUser | undefined>;
  getUserByUsername(username: string): Promise<AuthUser | undefined>;
  createUser(user: InsertAuthUser): Promise<AuthUser>;
  
  // Новые методы для работы с TON-адресом кошелька
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  updateUserWalletAddress(userId: number, walletAddress: string): Promise<User | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, AuthUser>;
  private appUsers: Map<number, User>; // Добавляем карту для пользователей из основной таблицы
  currentId: number;

  constructor() {
    this.users = new Map();
    this.appUsers = new Map(); // Инициализируем новую карту
    this.currentId = 1;
    
    // Создаем тестового пользователя для демонстрации
    this.appUsers.set(1, {
      id: 1,
      telegram_id: 123456789,
      username: "test_user",
      wallet: "test_wallet",
      ton_wallet_address: null,
      balance_uni: "20823.101727",
      balance_ton: "5.2549911129",
      uni_deposit_amount: "0",
      uni_farming_start_timestamp: null,
      uni_farming_balance: "0",
      uni_farming_last_update: null,
      created_at: new Date(),
      checkin_last_date: null,
      checkin_streak: 0
    });
  }
  
  // Добавляем публичный метод для доступа к аппуссеру по ID
  async getUserById(id: number): Promise<User | undefined> {
    return this.appUsers.get(id);
  }

  async getUser(id: number): Promise<AuthUser | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<AuthUser | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertAuthUser): Promise<AuthUser> {
    const id = this.currentId++;
    const user: AuthUser = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Реализация новых методов
  
  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    console.log(`[Storage] Поиск пользователя по адресу кошелька: ${walletAddress}`);
    
    // В реальной БД используем db.select().from(users).where(eq(users.ton_wallet_address, walletAddress))
    return Array.from(this.appUsers.values()).find(
      (user) => user.ton_wallet_address === walletAddress
    );
  }
  
  async updateUserWalletAddress(userId: number, walletAddress: string): Promise<User | undefined> {
    console.log(`[Storage] Обновление адреса кошелька для пользователя ${userId}: ${walletAddress}`);
    
    const user = this.appUsers.get(userId);
    if (!user) {
      console.log(`[Storage] Пользователь с ID ${userId} не найден`);
      return undefined;
    }
    
    // Обновляем адрес кошелька
    user.ton_wallet_address = walletAddress;
    this.appUsers.set(userId, user);
    
    console.log(`[Storage] Адрес кошелька для пользователя ${userId} успешно обновлен`);
    return user;
  }
}

export const storage = new MemStorage();
