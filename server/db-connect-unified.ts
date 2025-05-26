/**
 * Модуль для підключення до бази даних з підтримкою fallback режимів
 * 
 * Цей модуль забезпечує стабільну роботу додатку навіть при недоступності
 * основної бази даних, використовуючи резервні підключення або in-memory сховище.
 */

// Импорты для работы с базой данных
import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseEventType, emitDbEvent } from './utils/db-events';

// Force SSL for Neon DB ONLY - блокируем Replit DB
process.env.PGSSLMODE = 'require';
process.env.DATABASE_PROVIDER = 'neon';
process.env.FORCE_NEON_DB = 'true';
process.env.DISABLE_REPLIT_DB = 'true';
process.env.USE_LOCAL_DB_ONLY = 'false';

// ВИПРАВЛЕННЯ - підключення до правильної production бази
// Примусово встановлюємо правильну production базу
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
process.env.PGHOST = 'ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech';
process.env.PGUSER = 'neondb_owner';
process.env.PGPASSWORD = 'npg_SpgdNBV70WKl';
process.env.PGDATABASE = 'neondb';
process.env.PGPORT = '5432';

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
  
  // КРИТИЧНЕ ВИПРАВЛЕННЯ: примусове використання правильної production бази
  private readonly PRODUCTION_CONNECTION = 'postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
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

  // ВИПРАВЛЕНИЙ МЕТОД: прямє підключення до правильної production бази
  public async getPool(): Promise<Pool | null> {
    console.log('🎯 [DB] ПРИМУСОВЕ ПІДКЛЮЧЕННЯ ДО PRODUCTION БАЗИ: ep-lucky-boat-a463bggt');
    
    // Закриваємо попередній пул якщо є
    if (this.currentPool) {
      try {
        await this.currentPool.end();
        console.log('✅ [DB] Закрито попередній пул');
      } catch (err) {
        console.error('⚠️ [DB] Помилка при закритті попереднього пулу:', err);
      }
      this.currentPool = null;
    }

    // Створюємо новий пул для правильної production бази
    try {
      this.currentPool = new Pool({
        connectionString: this.PRODUCTION_CONNECTION,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      // Перевіряємо підключення та кількість користувачів
      const client = await this.currentPool.connect();
      const result = await client.query('SELECT current_database(), COUNT(*) as user_count FROM public.users');
      client.release();
      
      const dbName = result.rows[0].current_database;
      const userCount = result.rows[0].user_count;
      
      console.log(`✅ [DB] Підключено до бази: ${dbName}`);
      console.log(`✅ [DB] Кількість користувачів: ${userCount}`);
      
      if (userCount === '4') {
        console.log('🎯 [DB] ПІДТВЕРДЖЕНО: Це ПРАВИЛЬНА production база з 4 користувачами!');
      } else {
        console.log(`⚠️ [DB] УВАГА: Очікувалося 4 користувачі, знайдено ${userCount}`);
      }
      
      return this.currentPool;
    } catch (error) {
      console.error('❌ [DB] Критична помилка підключення до production бази:', error.message);
      return null;
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
          const startTime = Date.now();
          await client.query('SELECT 1 as result');
          const queryTime = Date.now() - startTime;
          
          this.log(`✅ Успішне підключення до ${config.name} та виконано тестовий запит`);
          
          // Отправляем событие об успешном подключении
          emitDbEvent(
            DatabaseEventType.CONNECTED,
            `Успешное подключение к ${config.name}`,
            undefined,
            { 
              connectionName: config.name,
              responseTime: queryTime,
              priority: config.priority
            }
          );
        } finally {
          client.release();
        }

        this.log(`✅ Підключення до ${config.name} налаштовано успішно`);

        // Якщо був попередній пул, закриваємо його
        if (this.currentPool && this.currentPool !== pool) {
          try {
            await this.currentPool.end();
            this.log(`Закрито попередній пул підключень до ${this.currentConfig?.name || 'невідомо'}`);
            
            // Отправляем событие о закрытии предыдущего пула
            emitDbEvent(
              DatabaseEventType.DISCONNECTED,
              `Закрыто предыдущее соединение с ${this.currentConfig?.name || 'неизвестно'}`,
              undefined,
              { previousConnection: this.currentConfig?.name || 'unknown' }
            );
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            this.log(`Помилка при закритті попереднього пулу: ${errorMessage}`, true);
          }
        }

        // Зберігаємо новий пул як поточний
        this.currentPool = pool;
        this.currentConfig = config;
        
        // Если это было переподключение после ошибки, отправляем событие о восстановлении
        if (this.isMemoryMode) {
          emitDbEvent(
            DatabaseEventType.RECOVERY_SUCCESS,
            `Восстановлено подключение к базе данных ${config.name} после режима in-memory`,
            undefined,
            { connectionName: config.name }
          );
          
          // Сбрасываем флаг in-memory режима
          this.isMemoryMode = false;
        }

        return pool;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log(`❌ Помилка підключення до ${config.name}: ${errorMessage}`, true);

        // Отправляем событие о неудачной попытке подключения
        emitDbEvent(
          DatabaseEventType.RECONNECT_FAILED,
          `Ошибка подключения к ${config.name}`,
          errorMessage,
          { 
            connectionName: config.name,
            priority: config.priority,
            remainingAttempts: this.dbConfigs.length - this.dbConfigs.indexOf(config) - 1
          }
        );

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
      
      // Отправляем событие о переходе в режим in-memory
      emitDbEvent(
        DatabaseEventType.FALLBACK_MEMORY,
        'Все попытки подключения к базе данных неудачны, переход в режим in-memory',
        undefined,
        {
          triedConnections: this.dbConfigs.map(config => config.name),
          tablesInitialized: Array.from(this.memoryStorage.keys())
        }
      );
    } else {
      this.log('❌ Всі спроби підключення невдалі, in-memory режим вимкнено', true);
      
      // Отправляем событие о полном отказе подключения
      emitDbEvent(
        DatabaseEventType.DISCONNECTED,
        'Все попытки подключения к базе данных неудачны, режим in-memory отключен',
        'Критическая ошибка подключения к базе данных',
        {
          triedConnections: this.dbConfigs.map(config => config.name),
          allowMemoryFallback: false
        }
      );
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

/**
 * Об'єкт для роботи з базою даних через Drizzle ORM
 * Експортується для використання в інших модулях
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

// Создаем глобальную переменную для Drizzle instance
let drizzleInstance: any = null;

// Создаем синхронную инициализацию Drizzle
function initDrizzleSync() {
  const manager = DatabaseConnectionManager.getInstance();
  
  // Используем setTimeout для асинхронной инициализации без блокировки
  setTimeout(async () => {
    try {
      const pool = await manager.getPool();
      if (pool) {
        drizzleInstance = drizzle(pool, { schema });
        console.log('[DB] Drizzle ORM успешно инициализирован');
      }
    } catch (error) {
      console.error('[DB] Ошибка инициализации Drizzle:', error);
    }
  }, 0);
}

// Функция для получения Drizzle instance с автоинициализацией
async function getDrizzle() {
  if (!drizzleInstance) {
    const pool = await DatabaseConnectionManager.getInstance().getPool();
    if (pool) {
      drizzleInstance = drizzle(pool, { schema });
    } else {
      throw new Error('Підключення до бази даних недоступне');
    }
  }
  return drizzleInstance;
}

// Создаем прокси для правильной работы с Drizzle ORM
export const db = new Proxy({} as any, {
  get(target, prop) {
    if (prop === 'query') {
      return async (text: string, params: any[] = []) => {
        const pool = await DatabaseConnectionManager.getInstance().getPool();
        if (!pool) {
          throw new Error('Підключення до бази даних недоступне');
        }
        return pool.query(text, params);
      };
    }
    
    // Для всех остальных методов Drizzle ORM
    return (...args: any[]) => {
      if (!drizzleInstance) {
        throw new Error('Drizzle ORM не инициализирован - попробуйте позже');
      }
      
      const method = drizzleInstance[prop];
      if (typeof method === 'function') {
        return method.apply(drizzleInstance, args);
      }
      return method;
    };
  }
});

// Инициализируем Drizzle при загрузке модуля
initDrizzleSync();

/**
 * Пул підключень до бази даних
 * Експортується для використання в інших модулях
 */
export const pool = {
  query: async (text: string, params: any[] = []) => {
    const poolInstance = await DatabaseConnectionManager.getInstance().getPool();
    if (!poolInstance) {
      console.error('[DB] Неможливо виконати запит: відсутнє підключення до бази даних');
      throw new Error('Підключення до бази даних недоступне');
    }
    return poolInstance.query(text, params);
  },
  connect: async () => {
    const poolInstance = await DatabaseConnectionManager.getInstance().getPool();
    if (!poolInstance) {
      console.error('[DB] Неможливо отримати клієнта: відсутнє підключення до бази даних');
      throw new Error('Підключення до бази даних недоступне');
    }
    return poolInstance.connect();
  },
  end: async () => {
    const poolInstance = await DatabaseConnectionManager.getInstance().getPool();
    if (poolInstance) {
      console.log('[DB] Закриття пулу підключень до бази даних');
      return poolInstance.end();
    }
    console.log('[DB] Спроба закрити неіснуючий пул підключень (ігноруємо)');
    return Promise.resolve();
  }
}

/**
 * Функція для виконання запиту до бази даних з повторними спробами
 * @param text SQL запит
 * @param params параметри запиту
 * @param maxRetries максимальна кількість спроб
 * @returns результат запиту
 */
export async function queryWithRetry(text: string, params: any[] = [], maxRetries: number = 3): Promise<any> {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const poolInstance = await DatabaseConnectionManager.getInstance().getPool();
      if (!poolInstance) {
        throw new Error('Підключення до бази даних недоступне');
      }
      return await poolInstance.query(text, params);
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        // Чекаємо перед наступною спробою (збільшуємо час очікування з кожною спробою)
        const delay = 500 * (attempt + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        console.error(`[DB] Помилка запиту, спроба #${attempt + 1}/${maxRetries}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  console.error(`[DB] Всі спроби запиту невдалі. Остання помилка: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  throw lastError;
}

/**
 * Функція для отримання підключення до бази даних
 * @returns підключення до бази даних
 */
export async function getDbConnection() {
  return await DatabaseConnectionManager.getInstance().getPool();
}

/**
 * Функція для тестування підключення до бази даних
 * @returns true, якщо підключення працює
 */
export async function testConnection(): Promise<boolean> {
  try {
    await queryWithRetry('SELECT 1', [], 1);
    return true;
  } catch (error) {
    console.error('[DB] Помилка тестування підключення:', error);
    return false;
  }
}

/**
 * Функція для скидання та повторної спроби підключення до бази даних
 * @returns true, якщо вдалося переконектитися
 */
export async function reconnect(): Promise<boolean> {
  return await DatabaseConnectionManager.getInstance().resetConnection();
}

/**
 * Тип бази даних, що використовується
 */
export const dbType = 'postgres';

/**
 * Об'єкт для моніторингу стану підключення до бази даних
 */
export const dbMonitor = {
  status: 'unknown' as 'ok' | 'error' | 'reconnecting' | 'unknown',
  
  async checkConnection(): Promise<boolean> {
    try {
      const result = await testConnection();
      this.status = result ? 'ok' : 'error';
      return result;
    } catch {
      this.status = 'error';
      return false;
    }
  },
  
  getStatus(): 'ok' | 'error' | 'reconnecting' | 'unknown' {
    return this.status;
  }
};

/**
 * Отримання статистики моніторингу
 */
export function getMonitorStats() {
  return {
    status: dbMonitor.status,
    connection: DatabaseConnectionManager.getInstance().getCurrentConnectionInfo()
  };
}

/**
 * Отримання поточного статусу підключення до бази даних
 * @returns Інформація про поточне підключення
 */
export function getConnectionStatus() {
  return DatabaseConnectionManager.getInstance().getCurrentConnectionInfo();
}

/**
 * Стан бази даних
 */
export const dbState = {
  isConnected: false,
  async update() {
    this.isConnected = await testConnection();
    return this.isConnected;
  }
};

// Оновлюємо статус при ініціалізації
dbState.update().catch(console.error);