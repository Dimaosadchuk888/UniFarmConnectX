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
    const updatedAt = createdAt;
    
    const newUser: User = {
      id,
      ...insertUser,
      created_at: createdAt,
      updated_at: updatedAt,
      wallet_address: insertUser.wallet_address || null,
      ref_code: insertUser.ref_code || `REF${id.toString().padStart(6, '0')}`,
      ref_parent_id: insertUser.ref_parent_id || null,
      uni_balance: 0,
      ton_balance: 0,
      telegram_id: insertUser.telegram_id || null,
      username: insertUser.username || `user${id}`,
      guest_id: insertUser.guest_id || null
    };
    
    this.users.push(newUser);
    return newUser;
  }
}

// Экспортируем экземпляр хранилища с фиктивными данными
export const storage = new MemStorage();