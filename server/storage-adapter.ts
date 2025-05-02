import { users, type User, type InsertUser } from "../shared/schema";
import { eq, sql } from "drizzle-orm";
import { db, pool, dbConnectionStatus, queryWithRetry, getCurrentProvider } from "./db-selector";
import { IStorage, MemStorage } from './storage-memory';
import { createInsertSchema } from "drizzle-zod";

// Адаптер для хранилища с фолбеком на хранилище в памяти
class StorageAdapter implements IStorage {
  private dbStorage: IStorage;
  private _memStorage: MemStorage;
  private useMemory: boolean = false;
  private checkConnectionInterval: NodeJS.Timeout | null = null;
  private reconnectAttempt: number = 0;
  private maxReconnectAttempts: number = 20; // Максимальное количество попыток переподключения
  private lastConnectionCheck: number = 0; // Время последней проверки
  private connectionCheckThrottle: number = 5000; // Минимальное время между проверками (5 секунд)
  
  // Геттер для доступа к хранилищу в памяти
  get memStorage(): MemStorage {
    return this._memStorage;
  }
  
  // Проверка текущего использования хранилища
  get isUsingMemory(): boolean {
    return this.useMemory;
  }
  
  constructor() {
    this._memStorage = new MemStorage();
    
    // Реализация хранилища с использованием базы данных
    this.dbStorage = {
      async getUser(id: number): Promise<User | undefined> {
        try {
          const [user] = await queryWithRetry('SELECT * FROM users WHERE id = $1', [id])
            .then(result => result.rows as User[]);
          return user || undefined;
        } catch (error) {
          console.error('[StorageAdapter] Ошибка при получении пользователя из БД:', error);
          throw error;
        }
      },
      
      async getUserByUsername(username: string): Promise<User | undefined> {
        try {
          const [user] = await queryWithRetry('SELECT * FROM users WHERE username = $1', [username])
            .then(result => result.rows as User[]);
          return user || undefined;
        } catch (error) {
          console.error('[StorageAdapter] Ошибка при получении пользователя по имени из БД:', error);
          throw error;
        }
      },
      
      async getUserByGuestId(guestId: string): Promise<User | undefined> {
        try {
          console.log(`[StorageAdapter] Получение пользователя по guest_id: ${guestId}`);
          const [user] = await queryWithRetry('SELECT * FROM users WHERE guest_id = $1', [guestId])
            .then(result => result.rows as User[]);
          return user || undefined;
        } catch (error) {
          console.error(`[StorageAdapter] Ошибка при получении пользователя по guest_id ${guestId}:`, error);
          throw error;
        }
      },
      
      async getUserByRefCode(refCode: string): Promise<User | undefined> {
        try {
          console.log(`[StorageAdapter] Получение пользователя по ref_code: ${refCode}`);
          const [user] = await queryWithRetry('SELECT * FROM users WHERE ref_code = $1', [refCode])
            .then(result => result.rows as User[]);
          return user || undefined;
        } catch (error) {
          console.error(`[StorageAdapter] Ошибка при получении пользователя по ref_code ${refCode}:`, error);
          throw error;
        }
      },
      
      async updateUserRefCode(userId: number, refCode: string): Promise<User | undefined> {
        try {
          console.log(`[StorageAdapter] Обновление ref_code для пользователя ID: ${userId}, новый код: ${refCode}`);
          const [user] = await queryWithRetry(
            'UPDATE users SET ref_code = $1 WHERE id = $2 RETURNING *',
            [refCode, userId]
          ).then(result => result.rows as User[]);
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
          const result = await queryWithRetry(
            'SELECT COUNT(*) as count FROM users WHERE ref_code = $1',
            [refCode]
          );
          return Number(result.rows[0].count) === 0;
        } catch (error) {
          console.error(`[StorageAdapter] Ошибка при проверке уникальности ref_code ${refCode}:`, error);
          throw error;
        }
      },
      
      async createUser(insertUser: InsertUser): Promise<User> {
        try {
          const columns = Object.keys(insertUser).join(', ');
          const values = Object.keys(insertUser).map((_, i) => `$${i + 1}`).join(', ');
          const placeholders = Object.values(insertUser);
          
          const query = `
            INSERT INTO users (${columns})
            VALUES (${values})
            RETURNING *
          `;
          
          const result = await queryWithRetry(query, placeholders);
          if (result.rows.length === 0) {
            throw new Error('Не удалось создать пользователя');
          }
          
          return result.rows[0] as User;
        } catch (error) {
          console.error('[StorageAdapter] Ошибка при создании пользователя в БД:', error);
          throw error;
        }
      }
    };
    
    // Проверяем доступность базы данных
    this.checkDatabaseConnection();
    
    // Запускаем периодическую проверку доступности базы данных
    this.startConnectionCheck();
  }
  
  // Запуск периодической проверки соединения
  private startConnectionCheck() {
    // Интервал проверки - 15 секунд
    this.checkConnectionInterval = setInterval(() => {
      this.reconnectToDatabase();
    }, 15000);
  }
  
  // Остановка периодической проверки соединения
  private stopConnectionCheck() {
    if (this.checkConnectionInterval) {
      clearInterval(this.checkConnectionInterval);
      this.checkConnectionInterval = null;
    }
  }
  
  // Попытка восстановить соединение с базой данных
  private async reconnectToDatabase() {
    // Если мы не используем память (уже подключены к БД) - ничего не делаем
    if (!this.useMemory) return;
    
    // Проверяем, не прошло ли мало времени с последней проверки
    const now = Date.now();
    if (now - this.lastConnectionCheck < this.connectionCheckThrottle) return;
    this.lastConnectionCheck = now;
    
    try {
      this.reconnectAttempt++;
      console.log(`[StorageAdapter] Попытка переподключения к БД (${this.reconnectAttempt}/${this.maxReconnectAttempts})...`);
      
      const isConnected = await this.checkDatabaseConnection();
      
      if (isConnected) {
        console.log('[StorageAdapter] ✅ Переподключение к БД успешно!');
        
        // Сбрасываем счетчик попыток
        this.reconnectAttempt = 0;
        
        // Если достигнуто максимальное количество попыток, останавливаем проверки
        if (this.reconnectAttempt >= this.maxReconnectAttempts) {
          console.warn('[StorageAdapter] Достигнут предел попыток переподключения к БД. Остаемся на хранилище в памяти.');
          this.stopConnectionCheck();
        }
      } else {
        console.log('[StorageAdapter] ❌ Переподключение к БД не удалось.');
      }
    } catch (error) {
      console.error('[StorageAdapter] Ошибка при попытке переподключения к БД:', error);
    }
  }
  
  // Проверка подключения к базе данных с возвратом статуса
  private async checkDatabaseConnection(): Promise<boolean> {
    try {
      // Выполняем простой запрос к базе данных
      await queryWithRetry('SELECT 1', [], 1); // Только 1 попытка для проверки
      console.log('[StorageAdapter] Соединение с базой данных установлено');
      this.useMemory = false;
      return true;
    } catch (error) {
      console.error('[StorageAdapter] Ошибка подключения к базе данных, переключаемся на хранилище в памяти:', error);
      this.useMemory = true;
      return false;
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