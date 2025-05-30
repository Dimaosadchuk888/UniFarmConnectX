/**
 * СПРОЩЕНЕ ПІДКЛЮЧЕННЯ ДО PRODUCTION NEON DB
 * Тільки пряме з'єднання з ep-lucky-boat-a463bggt
 */

import { Pool, PoolClient } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema.js';
import logger from './utils/logger';

// PRODUCTION DATABASE CONNECTION STRING
const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Глобальные переменные для подключения
let globalDb: any = null;
let globalPool: any = null;
let globalDbType: string = 'unknown';
let connectionRetries = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 секунды

class SimpleProductionDB {
  private static instance: SimpleProductionDB;
  private pool: Pool | null = null;
  private drizzleDb: any = null;

  private constructor() {
    console.log('🎯 [DB] Ініціалізація PRODUCTION підключення до ep-lucky-boat-a463bggt');
  }

  public static getInstance(): SimpleProductionDB {
    if (!SimpleProductionDB.instance) {
      SimpleProductionDB.instance = new SimpleProductionDB();
    }
    return SimpleProductionDB.instance;
  }

  public async getPool(): Promise<Pool> {
    if (!this.pool) {
      console.log('🚀 [DB] Створення підключення до PRODUCTION бази...');

      this.pool = new Pool({
        connectionString: PRODUCTION_DB_URL,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      // Перевірка підключення
      try {
        const client = await this.pool.connect();
        const result = await client.query('SELECT current_database(), COUNT(*) as user_count FROM public.users');
        client.release();

        const dbName = result.rows[0].current_database;
        const userCount = result.rows[0].user_count;

        console.log(`✅ [DB CONNECTED] to ep-lucky-boat-a463bggt`);
        console.log(`✅ [DB] База: ${dbName}, користувачів: ${userCount}`);

        if (userCount === '4') {
          console.log('🎯 [DB] ПІДТВЕРДЖЕНО: ПРАВИЛЬНА production база з 4 користувачами!');
        } else {
          console.log(`⚠️ [DB] УВАГА: Очікувалося 4 користувачі, знайдено ${userCount}`);
        }
      } catch (error) {
        console.error('❌ [DB] Помилка підключення:', error.message);
        throw error;
      }
    }

    return this.pool;
  }

  public async getClient(): Promise<PoolClient> {
    const pool = await this.getPool();
    return pool.connect();
  }

  public async getDrizzle() {
    if (!this.drizzleDb) {
      const pool = await this.getPool();
      this.drizzleDb = drizzle(pool, { schema });
    }
    return this.drizzleDb;
  }
}

// Експорт єдиного екземпляра
const dbManager = SimpleProductionDB.getInstance();

// Основні експорти для сумісності
export const getConnectionManager = () => dbManager;
export const pool = {
  connect: async () => {
    // Примусово використовуємо правильну production базу
    const productionPool = new Pool({
      connectionString: PRODUCTION_DB_URL,
      ssl: { rejectUnauthorized: false }
    });
    return productionPool.connect();
  },
  query: async (text: string, params: any[] = []) => {
    // Примусово використовуємо правильну production базу
    const productionPool = new Pool({
      connectionString: PRODUCTION_DB_URL,
      ssl: { rejectUnauthorized: false }
    });
    const client = await productionPool.connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
      await productionPool.end();
    }
  }
};

// Глобальная переменная для Drizzle
let globalDrizzleInstance: any = null;

async function getDrizzleInstance() {
  if (!globalDrizzleInstance) {
    const productionPool = new Pool({
      connectionString: PRODUCTION_DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    // Проверяем подключение
    try {
      const client = await productionPool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ [DB] Drizzle ORM успешно инициализирован');
    } catch (error) {
      console.error('❌ [DB] Ошибка инициализации Drizzle:', error);
      throw error;
    }
    
    globalDrizzleInstance = drizzle(productionPool, { schema });
  }
  return globalDrizzleInstance;
}

export const db = new Proxy({} as any, {
  get(target, prop) {
    return async (...args: any[]) => {
      const drizzleDb = await getDrizzleInstance();
      if (typeof drizzleDb[prop] === 'function') {
        return drizzleDb[prop](...args);
      }
      return drizzleDb[prop];
    };
  }
});

/**
 * Проверяет здоровье подключения к базе данных
 * @returns {Promise<boolean>} true если подключение здорово
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    if (!db) return false;

    const result = await Promise.race([
      db.execute('SELECT 1 as health_check'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 5000))
    ]);

    return result !== null;
  } catch (error) {
    console.warn('[DB Health] Проверка здоровья БД не удалась:', error);
    return false;
  }
}

/**
 * Выполняет запрос с повторными попытками при ошибке
 * @param {string} query SQL запрос
 * @param {any[]} params Параметры запроса
 * @returns {Promise<any>} Результат запроса
 */
export async function queryWithRetry(query: string, params: any[] = []): Promise<any> {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Проверяем здоровье подключения перед запросом
      if (!globalDb || !(await isDatabaseHealthy())) {
        console.log(`[DB Query] Подключение нездорово или отсутствует, переинициализируем (попытка ${attempt})...`);
        globalDb = null;
        globalPool = null;
        
        // Переинициализируем подключение через dbManager
        const pool = await dbManager.getPool();
        const drizzleDb = await dbManager.getDrizzle();
        globalDb = drizzleDb;
        globalPool = pool;
      }

      // Дополнительная проверка что globalDb инициализирован
      if (!globalDb) {
        throw new Error('Failed to initialize database connection');
      }

      console.log(`[DB Query] Выполнение запроса (попытка ${attempt}/${maxRetries}):`, query.substring(0, 100));

      // Выполняем запрос напрямую через pool если drizzle не работает
      let result;
      try {
        const queryPromise = globalDb.execute ? globalDb.execute(query, params) : globalPool.query(query, params);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query execution timeout')), 30000)
        );

        result = await Promise.race([queryPromise, timeoutPromise]);
      } catch (drizzleError) {
        console.log(`[DB Query] Drizzle ошибка, используем прямой pool запрос:`, drizzleError.message);
        result = await globalPool.query(query, params);
      }

      if (attempt > 1) {
        console.log(`[DB Query] ✅ Запрос успешен на попытке ${attempt}`);
      }

      return result;
    } catch (error) {
      lastError = error;
      console.error(`[DB Query] ❌ Ошибка выполнения запроса (попытка ${attempt}/${maxRetries}):`, error);

      if (attempt < maxRetries) {
        // Очищаем подключение для повторной инициализации
        globalDb = null;
        globalPool = null;

        // Прогрессивная задержка
        const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        console.log(`[DB Query] ⏳ Ожидание ${delay}ms перед повторной попыткой...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error('[DB Query] ❌ Все попытки выполнения запроса исчерпаны');
  throw lastError;
}

export async function getDbConnection() {
  return dbManager.getPool();
}

/**
 * Тестирует подключение к базе данных с retry логикой
 * @returns {Promise<boolean>} true если подключение успешно
 */
export async function testConnection(): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[DB Connection] 🔄 Попытка ${attempt}/${MAX_RETRIES}: Тестирование подключения к базе данных...`);

      // Используем прямое подключение к pool
      const pool = await dbManager.getPool();
      const client = await pool.connect();
      
      try {
        const result = await client.query('SELECT 1 as test');
        console.log(`[DB Connection] ✅ Тест подключения успешен на попытке ${attempt}:`, result.rows);
        connectionRetries = 0;
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`[DB Connection] ❌ Ошибка при тестировании подключения (попытка ${attempt}/${MAX_RETRIES}):`, error);

      if (attempt < MAX_RETRIES) {
        console.log(`[DB Connection] ⏳ Ожидание ${RETRY_DELAY}ms перед следующей попыткой...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } else {
        connectionRetries = attempt;
        console.error('[DB Connection] ❌ Исчерпаны все попытки подключения к базе данных');
      }
    }
  }

  return false;
}

// Статус підключення
export function getConnectionStatus() {
  return {
    isConnected: true,
    connectionName: 'production-neon-ep-lucky-boat-a463bggt',
    isMemoryMode: false
  };
}

export const dbType = 'postgres';
export const dbState = {
  isReady: true
};