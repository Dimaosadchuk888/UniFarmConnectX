/**
 * ЄДИНИЙ МОДУЛЬ ДЛЯ ПІДКЛЮЧЕННЯ ДО PRODUCTION БАЗИ
 * Використовується всіма контролерами та сервісами
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema.js';

// ВАША ПРАВИЛЬНА PRODUCTION БАЗА
const PRODUCTION_CONNECTION = 'postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

let productionPool: Pool | null = null;
let productionDb: any = null;

// Ініціалізація підключення до production бази
async function initProductionDb() {
  if (!productionPool) {
    console.log('🎯 [PRODUCTION DB] Ініціалізація підключення до ep-lucky-boat-a463bggt');
    
    productionPool = new Pool({
      connectionString: PRODUCTION_CONNECTION,
      ssl: { rejectUnauthorized: false },
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    productionDb = drizzle(productionPool, { schema });
    
    // Перевірка підключення
    try {
      const client = await productionPool.connect();
      const result = await client.query('SELECT current_database(), COUNT(*) as users FROM public.users');
      client.release();
      
      console.log('✅ [PRODUCTION DB] Підключено до:', result.rows[0].current_database);
      console.log('👥 [PRODUCTION DB] Користувачів:', result.rows[0].users);
    } catch (error) {
      console.error('❌ [PRODUCTION DB] Помилка ініціалізації:', error.message);
      throw error;
    }
  }
  
  return { pool: productionPool, db: productionDb };
}

// Експорт для використання в контролерах
export async function getProductionDb() {
  const { db } = await initProductionDb();
  return db;
}

export async function getProductionPool() {
  const { pool } = await initProductionDb();
  return pool;
}

export async function queryProduction(text: string, params: any[] = []) {
  const pool = await getProductionPool();
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

// Замінюємо стандартні експорти
export const db = new Proxy({} as any, {
  get(target, prop) {
    return async (...args: any[]) => {
      const productionDb = await getProductionDb();
      return (productionDb as any)[prop](...args);
    };
  }
});

export const pool = {
  query: async (text: string, params: any[] = []) => queryProduction(text, params),
  connect: async () => {
    const pool = await getProductionPool();
    return pool.connect();
  }
};

// Автоматична ініціалізація при імпорті
initProductionDb().catch(console.error);