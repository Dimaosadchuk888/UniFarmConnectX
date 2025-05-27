/**
 * СПРОЩЕНЕ ПІДКЛЮЧЕННЯ ДО PRODUCTION NEON DB
 * Тільки пряме з'єднання з ep-lucky-boat-a463bggt
 */

import { Pool, PoolClient } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema.js';

// PRODUCTION DATABASE CONNECTION STRING
const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

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

export const db = new Proxy({} as any, {
  get(target, prop) {
    return async (...args: any[]) => {
      // Примусово використовуємо правильну production базу
      const productionPool = new Pool({
        connectionString: PRODUCTION_DB_URL,
        ssl: { rejectUnauthorized: false }
      });
      const drizzleDb = drizzle(productionPool, { schema });
      return drizzleDb[prop](...args);
    };
  }
});

export async function queryWithRetry(text: string, params: any[] = []): Promise<any> {
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

export async function getDbConnection() {
  return dbManager.getPool();
}

export async function testConnection(): Promise<boolean> {
  try {
    const pool = await dbManager.getPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ [DB] Тест підключення невдалий:', error.message);
    return false;
  }
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