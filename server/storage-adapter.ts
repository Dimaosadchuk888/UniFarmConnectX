import { users, type User, type InsertUser } from "../shared/schema";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "./db";
import { IStorage, MemStorage } from './storage-memory';
import { createInsertSchema } from "drizzle-zod";

// Адаптер для хранилища с фолбеком на хранилище в памяти
class StorageAdapter implements IStorage {
  private dbStorage: IStorage;
  private memStorage: MemStorage;
  private useMemory: boolean = false;
  
  constructor() {
    this.memStorage = new MemStorage();
    
    // Реализация хранилища с использованием базы данных
    this.dbStorage = {
      async getUser(id: number): Promise<User | undefined> {
        try {
          const [user] = await db.select().from(users).where(eq(users.id, id));
          return user || undefined;
        } catch (error) {
          console.error('[StorageAdapter] Ошибка при получении пользователя из БД:', error);
          throw error;
        }
      },
      
      async getUserByUsername(username: string): Promise<User | undefined> {
        try {
          const [user] = await db.select().from(users).where(eq(users.username, username));
          return user || undefined;
        } catch (error) {
          console.error('[StorageAdapter] Ошибка при получении пользователя по имени из БД:', error);
          throw error;
        }
      },
      
      async createUser(insertUser: InsertUser): Promise<User> {
        try {
          const [user] = await db.insert(users).values(insertUser).returning();
          return user;
        } catch (error) {
          console.error('[StorageAdapter] Ошибка при создании пользователя в БД:', error);
          throw error;
        }
      }
    };
    
    // Проверяем доступность базы данных
    this.checkDatabaseConnection();
  }
  
  // Проверка подключения к базе данных
  private async checkDatabaseConnection() {
    try {
      // Выполняем простой запрос к базе данных
      await db.execute(sql`SELECT 1`);
      console.log('[StorageAdapter] Соединение с базой данных установлено');
      this.useMemory = false;
    } catch (error) {
      console.error('[StorageAdapter] Ошибка подключения к базе данных, переключаемся на хранилище в памяти:', error);
      this.useMemory = true;
    }
  }
  
  // Методы интерфейса IStorage с перенаправлением в зависимости от доступности БД
  async getUser(id: number): Promise<User | undefined> {
    try {
      if (this.useMemory) {
        return await this.memStorage.getUser(id);
      }
      return await this.dbStorage.getUser(id);
    } catch (error) {
      console.error('[StorageAdapter] Ошибка при получении пользователя, переключаемся на хранилище в памяти:', error);
      this.useMemory = true;
      return await this.memStorage.getUser(id);
    }
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      if (this.useMemory) {
        return await this.memStorage.getUserByUsername(username);
      }
      return await this.dbStorage.getUserByUsername(username);
    } catch (error) {
      console.error('[StorageAdapter] Ошибка при получении пользователя по имени, переключаемся на хранилище в памяти:', error);
      this.useMemory = true;
      return await this.memStorage.getUserByUsername(username);
    }
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      if (this.useMemory) {
        return await this.memStorage.createUser(insertUser);
      }
      return await this.dbStorage.createUser(insertUser);
    } catch (error) {
      console.error('[StorageAdapter] Ошибка при создании пользователя, переключаемся на хранилище в памяти:', error);
      this.useMemory = true;
      return await this.memStorage.createUser(insertUser);
    }
  }
}

// Экспортируем экземпляр адаптера для использования в приложении
export const storage = new StorageAdapter();