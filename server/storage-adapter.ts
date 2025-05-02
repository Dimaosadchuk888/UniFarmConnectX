import { users, type User, type InsertUser } from "../shared/schema";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "./db";
import { IStorage, MemStorage } from './storage-memory';
import { createInsertSchema } from "drizzle-zod";

// Адаптер для хранилища с фолбеком на хранилище в памяти
class StorageAdapter implements IStorage {
  private dbStorage: IStorage;
  private _memStorage: MemStorage;
  private useMemory: boolean = false;
  
  // Геттер для доступа к хранилищу в памяти
  get memStorage(): MemStorage {
    return this._memStorage;
  }
  
  constructor() {
    this._memStorage = new MemStorage();
    
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
      
      async getUserByGuestId(guestId: string): Promise<User | undefined> {
        try {
          console.log(`[StorageAdapter] Получение пользователя по guest_id: ${guestId}`);
          const [user] = await db.select().from(users).where(eq(users.guest_id, guestId));
          return user || undefined;
        } catch (error) {
          console.error(`[StorageAdapter] Ошибка при получении пользователя по guest_id ${guestId}:`, error);
          throw error;
        }
      },
      
      async getUserByRefCode(refCode: string): Promise<User | undefined> {
        try {
          console.log(`[StorageAdapter] Получение пользователя по ref_code: ${refCode}`);
          const [user] = await db.select().from(users).where(eq(users.ref_code, refCode));
          return user || undefined;
        } catch (error) {
          console.error(`[StorageAdapter] Ошибка при получении пользователя по ref_code ${refCode}:`, error);
          throw error;
        }
      },
      
      async updateUserRefCode(userId: number, refCode: string): Promise<User | undefined> {
        try {
          console.log(`[StorageAdapter] Обновление ref_code для пользователя ID: ${userId}, новый код: ${refCode}`);
          const [user] = await db
            .update(users)
            .set({ ref_code: refCode })
            .where(eq(users.id, userId))
            .returning();
          return user || undefined;
        } catch (error) {
          console.error(`[StorageAdapter] Ошибка при обновлении ref_code для пользователя ${userId}:`, error);
          throw error;
        }
      },
      
      generateRefCode(): string {
        console.log('[StorageAdapter] Генерация реферального кода');
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        
        for (let i = 0; i < 8; i++) {
          result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        return result;
      },
      
      async generateUniqueRefCode(): Promise<string> {
        console.log('[StorageAdapter] Генерация уникального реферального кода');
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
      },
      
      async isRefCodeUnique(refCode: string): Promise<boolean> {
        try {
          console.log(`[StorageAdapter] Проверка уникальности ref_code: ${refCode}`);
          const [count] = await db
            .select({ count: sql`count(*)` })
            .from(users)
            .where(eq(users.ref_code, refCode));
          return Number(count.count) === 0;
        } catch (error) {
          console.error(`[StorageAdapter] Ошибка при проверке уникальности ref_code ${refCode}:`, error);
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
  
  async getUserByGuestId(guestId: string): Promise<User | undefined> {
    try {
      if (this.useMemory) {
        return await this.memStorage.getUserByGuestId(guestId);
      }
      return await this.dbStorage.getUserByGuestId(guestId);
    } catch (error) {
      console.error(`[StorageAdapter] Ошибка при получении пользователя по guest_id ${guestId}, переключаемся на хранилище в памяти:`, error);
      this.useMemory = true;
      return await this.memStorage.getUserByGuestId(guestId);
    }
  }
  
  async getUserByRefCode(refCode: string): Promise<User | undefined> {
    try {
      if (this.useMemory) {
        return await this.memStorage.getUserByRefCode(refCode);
      }
      return await this.dbStorage.getUserByRefCode(refCode);
    } catch (error) {
      console.error(`[StorageAdapter] Ошибка при получении пользователя по ref_code ${refCode}, переключаемся на хранилище в памяти:`, error);
      this.useMemory = true;
      return await this.memStorage.getUserByRefCode(refCode);
    }
  }
  
  async updateUserRefCode(userId: number, refCode: string): Promise<User | undefined> {
    try {
      if (this.useMemory) {
        return await this.memStorage.updateUserRefCode(userId, refCode);
      }
      return await this.dbStorage.updateUserRefCode(userId, refCode);
    } catch (error) {
      console.error(`[StorageAdapter] Ошибка при обновлении ref_code для пользователя ${userId}, переключаемся на хранилище в памяти:`, error);
      this.useMemory = true;
      return await this.memStorage.updateUserRefCode(userId, refCode);
    }
  }
  
  generateRefCode(): string {
    if (this.useMemory) {
      return this.memStorage.generateRefCode();
    }
    return this.dbStorage.generateRefCode();
  }
  
  async generateUniqueRefCode(): Promise<string> {
    try {
      if (this.useMemory) {
        return await this.memStorage.generateUniqueRefCode();
      }
      return await this.dbStorage.generateUniqueRefCode();
    } catch (error) {
      console.error('[StorageAdapter] Ошибка при генерации уникального ref_code, переключаемся на хранилище в памяти:', error);
      this.useMemory = true;
      return await this.memStorage.generateUniqueRefCode();
    }
  }
  
  async isRefCodeUnique(refCode: string): Promise<boolean> {
    try {
      if (this.useMemory) {
        return await this.memStorage.isRefCodeUnique(refCode);
      }
      return await this.dbStorage.isRefCodeUnique(refCode);
    } catch (error) {
      console.error(`[StorageAdapter] Ошибка при проверке уникальности ref_code ${refCode}, переключаемся на хранилище в памяти:`, error);
      this.useMemory = true;
      return await this.memStorage.isRefCodeUnique(refCode);
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