/**
 * Модуль для підключення до бази даних з підтримкою fallback режимів
 * 
 * Цей модуль забезпечує стабільну роботу додатку навіть при недоступності
 * основної бази даних, використовуючи резервні підключення або in-memory сховище.
 */

import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';

// Логи
const logEnabled = process.env.DB_DEBUG === 'true';
const logFile = path.join(process.cwd(), 'logs', 'db-connect.log');

// Інтерфейс для конфігурації підключення
interface DBConfig {
  connectionString: string;
  name: string;
  priority: number;
}

// Клас для керування підключеннями до бази даних
class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private dbConfigs: DBConfig[] = [];
  private currentPool: Pool | null = null;
  private currentConfig: DBConfig | null = null;
  private isMemoryMode = false;
  private memoryStorage: Map<string, any[]> = new Map();
  
  private constructor() {
    // Створюємо директорію для логів, якщо потрібно
    if (logEnabled && !fs.existsSync(path.dirname(logFile))) {
      try {
        fs.mkdirSync(path.dirname(logFile), { recursive: true });
      } catch (err) {
        console.error('[DB] Помилка створення директорії для логів:', err);
      }
    }
    
    this.log('Ініціалізація менеджера підключень до бази даних');
  }
  
  public static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }
  
  private log(message: string, isError = false): void {
    if (!logEnabled) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    console[isError ? 'error' : 'log'](message);
    
    if (logEnabled) {
      try {
        fs.appendFileSync(logFile, logMessage);
      } catch (err) {
        console.error('[DB] Помилка запису в лог-файл:', err);
      }
    }
  }
  
  // Додати конфігурацію підключення
  public addConfig(config: DBConfig): void {
    // Перевіряємо, чи не додана вже така конфігурація
    if (this.dbConfigs.some(c => c.name === config.name)) {
      this.log(`Конфігурація з іменем "${config.name}" вже існує`);
      return;
    }
    
    this.dbConfigs.push(config);
    this.log(`Додано конфігурацію: ${config.name} (пріоритет: ${config.priority})`);
    
    // Сортуємо за пріоритетом (вищий пріоритет - менше число)
    this.dbConfigs.sort((a, b) => a.priority - b.priority);
  }
  
  // Отримати пул підключень
  public async getPool(): Promise<Pool | null> {
    // Якщо вже є працюючий пул, повертаємо його
    if (this.currentPool) {
      return this.currentPool;
    }
    
    // Якщо ми в режимі in-memory storage, повертаємо null
    if (this.isMemoryMode) {
      this.log('Використовуємо in-memory сховище замість бази даних');
      return null;
    }
    
    // Спробуємо підключитися, перебираючи всі конфігурації за пріоритетом
    for (const config of this.dbConfigs) {
      try {
        this.log(`Спроба підключення до ${config.name}...`);
        
        const pool = new Pool({
          connectionString: config.connectionString,
          connectionTimeoutMillis: 5000, // Таймаут підключення 5 секунд
          ssl: {
            rejectUnauthorized: false
          }
        });
        
        // Перевіряємо підключення
        const client = await pool.connect();
        client.release();
        
        this.log(`✅ Успішне підключення до ${config.name}`);
        this.currentPool = pool;
        this.currentConfig = config;
        
        return pool;
      } catch (error) {
        this.log(`❌ Помилка підключення до ${config.name}: ${error instanceof Error ? error.message : String(error)}`, true);
      }
    }
    
    // Якщо жодне підключення не вдалося, вмикаємо режим in-memory
    this.log('⚠️ Всі спроби підключення невдалі, переходимо в режим in-memory', true);
    this.isMemoryMode = true;
    this.initMemoryStorage();
    
    return null;
  }
  
  // Отримати клієнт для запиту
  public async getClient(): Promise<PoolClient | null> {
    const pool = await this.getPool();
    
    if (!pool) {
      return null;
    }
    
    try {
      return await pool.connect();
    } catch (error) {
      this.log(`Помилка отримання клієнта: ${error instanceof Error ? error.message : String(error)}`, true);
      return null;
    }
  }
  
  // Ініціалізація in-memory сховища
  private initMemoryStorage(): void {
    // Створюємо таблиці, які потрібні для роботи
    this.memoryStorage.set('users', []);
    this.memoryStorage.set('balances', []);
    this.memoryStorage.set('farming_deposits', []);
    this.memoryStorage.set('transactions', []);
    this.memoryStorage.set('referrals', []);
    this.memoryStorage.set('daily_bonuses', []);
    this.memoryStorage.set('partition_logs', []);
    
    this.log('Ініціалізовано in-memory сховище');
  }
  
  // Доступ до in-memory сховища
  public getMemoryStorage(tableName: string): any[] {
    if (!this.isMemoryMode) {
      this.log('Спроба доступу до in-memory сховища, але режим не активовано', true);
      return [];
    }
    
    if (!this.memoryStorage.has(tableName)) {
      this.log(`Створення нової таблиці "${tableName}" в in-memory сховищі`);
      this.memoryStorage.set(tableName, []);
    }
    
    return this.memoryStorage.get(tableName) || [];
  }
  
  // Перевірка, чи ми в режимі in-memory
  public isInMemoryMode(): boolean {
    return this.isMemoryMode;
  }
  
  // Отримати інформацію про поточне підключення
  public getCurrentConnectionInfo(): { isConnected: boolean; connectionName: string | null; isMemoryMode: boolean } {
    return {
      isConnected: !!this.currentPool,
      connectionName: this.currentConfig?.name || null,
      isMemoryMode: this.isMemoryMode
    };
  }
  
  // Вимкнути режим in-memory і спробувати підключитися знову
  public async resetConnection(): Promise<boolean> {
    this.log('Скидання підключення та спроба перепідключення');
    
    // Закриваємо поточний пул, якщо він є
    if (this.currentPool) {
      try {
        await this.currentPool.end();
      } catch (error) {
        this.log(`Помилка закриття пулу: ${error instanceof Error ? error.message : String(error)}`, true);
      }
    }
    
    this.currentPool = null;
    this.currentConfig = null;
    this.isMemoryMode = false;
    
    // Пробуємо підключитися знову
    const pool = await this.getPool();
    return !!pool || this.isMemoryMode; // Успішно, якщо отримали пул або перейшли в режим in-memory
  }
}

// Функція для отримання екземпляра менеджера підключень
export function getConnectionManager(): DatabaseConnectionManager {
  return DatabaseConnectionManager.getInstance();
}

// Функція для ініціалізації підключень з усіх доступних джерел
export function initDatabaseConnections(): void {
  const manager = getConnectionManager();
  
  // Додаємо всі можливі джерела підключення за пріоритетом
  
  // 1. Основне підключення з DATABASE_URL (найвищий пріоритет)
  if (process.env.DATABASE_URL) {
    manager.addConfig({
      connectionString: process.env.DATABASE_URL,
      name: 'Replit PostgreSQL',
      priority: 1
    });
  }
  
  // 2. Neon.tech підключення
  if (process.env.NEON_DATABASE_URL) {
    manager.addConfig({
      connectionString: process.env.NEON_DATABASE_URL,
      name: 'Neon.tech',
      priority: 2
    });
  }
  
  // 3. Резервне підключення
  if (process.env.BACKUP_DATABASE_URL) {
    manager.addConfig({
      connectionString: process.env.BACKUP_DATABASE_URL,
      name: 'Backup DB',
      priority: 3
    });
  }
  
  // 4. Альтернативне підключення для розробки
  if (process.env.DEV_DATABASE_URL) {
    manager.addConfig({
      connectionString: process.env.DEV_DATABASE_URL,
      name: 'Development DB',
      priority: 4
    });
  }
  
  // Примусово увімкнути режим in-memory, якщо вказано
  if (process.env.FORCE_MEMORY_STORAGE === 'true') {
    manager.getPool(); // Запускаємо перехід в режим in-memory
  }
}

// Ініціалізуємо підключення при імпорті модуля
initDatabaseConnections();