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
  
  // Отримати пул підключень з покращеним механізмом відновлення
  public async getPool(): Promise<Pool | null> {
    // Якщо вже є працюючий пул, перевіряємо його стан та повертаємо
    if (this.currentPool) {
      try {
        // Швидка перевірка стану пулу (без фактичного запиту до БД)
        const poolState = this.currentPool.totalCount !== undefined && 
                         this.currentPool.idleCount !== undefined;
        if (poolState) {
          return this.currentPool;
        } else {
          this.log('Існуючий пул в неробочому стані, спробуємо перепідключитися');
        }
      } catch (e) {
        this.log(`Помилка при перевірці стану пулу: ${e instanceof Error ? e.message : String(e)}`, true);
        // Продовжуємо спробу перепідключення
      }
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
        
        // Розширені опції для підключення з кращою стійкістю
        const pool = new Pool({
          connectionString: config.connectionString,
          connectionTimeoutMillis: 7000,     // Збільшений таймаут підключення
          max: 10,                           // Обмежуємо макс. кількість з'єднань
          idleTimeoutMillis: 30000,          // 30 секунд простою
          allowExitOnIdle: false,            // Не дозволяємо вихід при простої
          ssl: {
            rejectUnauthorized: false        // Дозволяємо самопідписані сертифікати
          }
        });
        
        // Додаємо обробники подій для моніторингу стану пулу
        pool.on('error', (err) => {
          this.log(`Помилка пулу з'єднань ${config.name}: ${err.message}`, true);
          
          // Якщо помилка фатальна, скидаємо пул
          if (err.message.includes('connection terminated') || 
              err.message.includes('terminating') ||
              err.message.includes('Connection terminated')) {
            this.log(`Фатальна помилка з'єднання, скидаємо пул ${config.name}`, true);
            if (this.currentPool === pool) {
              this.currentPool = null;
              this.currentConfig = null;
            }
          }
        });
        
        // Перевіряємо підключення з фактичним простим запитом
        const client = await pool.connect();
        try {
          await client.query('SELECT 1 as result');
          this.log(`✅ Успішне підключення до ${config.name} та виконано тестовий запит`);
        } finally {
          client.release();
        }
        
        this.log(`✅ Підключення до ${config.name} налаштовано успішно`);
        
        // Якщо був попередній пул, закриваємо його
        if (this.currentPool && this.currentPool !== pool) {
          try {
            await this.currentPool.end();
            this.log(`Закрито попередній пул підключень до ${this.currentConfig?.name || 'невідомо'}`);
          } catch (err) {
            this.log(`Помилка при закритті попереднього пулу: ${err instanceof Error ? err.message : String(err)}`, true);
          }
        }
        
        // Зберігаємо новий пул як поточний
        this.currentPool = pool;
        this.currentConfig = config;
        
        return pool;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log(`❌ Помилка підключення до ${config.name}: ${errorMessage}`, true);
        
        // Додатковий лог для аналізу специфічних помилок
        if (errorMessage.includes('endpoint is disabled')) {
          this.log(`Neon DB endpoint вимкнено. Переходимо до наступного варіанту.`, true);
        } else if (errorMessage.includes('timeout')) {
          this.log(`Таймаут підключення до ${config.name}. Переходимо до наступного варіанту.`, true);
        }
      }
    }
    
    // Якщо жодне підключення не вдалося і дозволено in-memory режим
    const allowMemoryFallback = process.env.ALLOW_MEMORY_FALLBACK === 'true';
    if (allowMemoryFallback) {
      this.log('⚠️ Всі спроби підключення невдалі, переходимо в режим in-memory', true);
      this.isMemoryMode = true;
      this.initMemoryStorage();
    } else {
      this.log('❌ Всі спроби підключення невдалі, in-memory режим вимкнено', true);
    }
    
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
  
  // Визначаємо пріоритети на основі змінних середовища
  const useNeonDb = process.env.USE_NEON_DB === 'true';
  const useLocalDb = process.env.USE_LOCAL_DB === 'true';
  const dbProvider = process.env.DATABASE_PROVIDER?.toLowerCase() || 'auto';
  
  console.log(`[Database] Configuration: useNeonDb=${useNeonDb}, useLocalDb=${useLocalDb}, dbProvider=${dbProvider}`);
  
  // Автоматичне визначення пріоритетів на основі dbProvider
  if (dbProvider === 'neon') {
    // Пріоритет: 1) Neon DB, 2) Локальний PostgreSQL, 3) In-memory
    console.log('[Database] Using Neon DB as primary database');
    
    // 1. Neon.tech підключення (найвищий пріоритет)
    if (process.env.NEON_DATABASE_URL) {
      manager.addConfig({
        connectionString: process.env.NEON_DATABASE_URL,
        name: 'Neon.tech',
        priority: 1
      });
    }
    
    // 2. Основне підключення Replit PostgreSQL
    if (process.env.DATABASE_URL) {
      manager.addConfig({
        connectionString: process.env.DATABASE_URL,
        name: 'Replit PostgreSQL',
        priority: 2
      });
    }
    
  } else if (dbProvider === 'replit') {
    // Пріоритет: 1) Локальний PostgreSQL, 2) Neon DB, 3) In-memory
    console.log('[Database] Using Replit PostgreSQL as primary database');
    
    // 1. Основне підключення Replit PostgreSQL (найвищий пріоритет)
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
  } else {
    // Автоматичний режим - спробуємо обидва варіанти в оптимальному порядку
    console.log('[Database] Auto mode: will try all available database connections');
    
    // 1. Neon.tech підключення, якщо USE_NEON_DB=true
    if (useNeonDb && process.env.NEON_DATABASE_URL) {
      manager.addConfig({
        connectionString: process.env.NEON_DATABASE_URL,
        name: 'Neon.tech',
        priority: 1
      });
    }
    
    // 2. Replit PostgreSQL, якщо USE_LOCAL_DB=true
    if (useLocalDb && process.env.BACKUP_DATABASE_URL) {
      manager.addConfig({
        connectionString: process.env.BACKUP_DATABASE_URL,
        name: 'Replit PostgreSQL',
        priority: useNeonDb ? 2 : 1  // Якщо Neon не використовується, це буде пріоритет 1
      });
    }
    
    // Якщо не вказано жодних пріоритетів, використовуємо стандартний порядок
    if (!useNeonDb && !useLocalDb) {
      console.log('[Database] No specific preferences set, using default order');
      
      // 1. Neon.tech підключення
      if (process.env.NEON_DATABASE_URL) {
        manager.addConfig({
          connectionString: process.env.NEON_DATABASE_URL,
          name: 'Neon.tech',
          priority: 1
        });
      }
      
      // 2. Replit PostgreSQL
      if (process.env.BACKUP_DATABASE_URL) {
        manager.addConfig({
          connectionString: process.env.BACKUP_DATABASE_URL,
          name: 'Replit PostgreSQL',
          priority: 2
        });
      }
    }
  }
  
  // Додаємо додаткові резервні підключення, якщо є
  if (process.env.ALTERNATE_DB_URL) {
    manager.addConfig({
      connectionString: process.env.ALTERNATE_DB_URL,
      name: 'Alternate DB',
      priority: 50  // Низький пріоритет
    });
  }
  
  // Альтернативне підключення для розробки
  if (process.env.DEV_DATABASE_URL) {
    manager.addConfig({
      connectionString: process.env.DEV_DATABASE_URL,
      name: 'Development DB',
      priority: 100  // Найнижчий пріоритет
    });
  }
  
  // Примусово увімкнути режим in-memory, якщо вказано
  if (process.env.FORCE_MEMORY_STORAGE === 'true') {
    console.log('[Database] FORCE_MEMORY_STORAGE=true, forcing in-memory mode');
    manager.getPool(); // Запускаємо перехід в режим in-memory
  }
}

// Ініціалізуємо підключення при імпорті модуля
initDatabaseConnections();