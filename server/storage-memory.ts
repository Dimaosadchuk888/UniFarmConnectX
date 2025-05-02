// Временная реализация хранилища в памяти для работы без базы данных
import { users, type User, type InsertUser } from "../shared/schema";
import { eq } from "drizzle-orm";

// Интерфейс хранилища (IStorage)
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
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