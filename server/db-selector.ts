import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";

// Тип подключения к базе данных
export enum DatabaseType {
  REPLIT = 'replit',
  NEON = 'neon'
}

// Объект для отслеживания состояния подключения к базе данных
export const dbConnectionStatus = {
  lastSuccessful: null as Date | null,
  lastFailed: null as Date | null,
  lastError: null as Error | null,
  isConnected: false,
  consecutiveFailures: 0,

  // Метод для обновления статуса соединения
  async update() {
    try {
      const result = await pool.query('SELECT 1');
      this.isConnected = true;
      this.lastSuccessful = new Date();
      this.consecutiveFailures = 0;
      return true;
    } catch (error) {
      this.isConnected = false;
      this.lastFailed = new Date();
      this.lastError = error as Error;
      this.consecutiveFailures++;
      return false;
    }
  }
};

// Определяем тип базы данных на основе переменных окружения
function getDatabaseType(): DatabaseType {
  // Если указана переменная DB_TYPE, используем её
  const dbType = process.env.DB_TYPE?.toLowerCase();
  if (dbType === 'neon') {
    return DatabaseType.NEON;
  }
  if (dbType === 'replit') {
    return DatabaseType.REPLIT;
  }

  // Если переменная не указана, но есть DATABASE_URL с "neon"
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && databaseUrl.includes('neon.tech')) {
    return DatabaseType.NEON;
  }

  // По умолчанию возвращаем Replit PostgreSQL
  return DatabaseType.REPLIT;
}

// Получаем настройки для подключения к соответствующей базе данных
function getDatabaseConfig() {
  const dbType = getDatabaseType();
  
  // Базовая проверка наличия DATABASE_URL
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?"
    );
  }

  console.log(`[DB] Connecting to ${dbType} database`);
  
  // Возвращаем настройки подключения
  return {
    connectionString: process.env.DATABASE_URL,
    ssl: dbType === DatabaseType.NEON || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false
  };
}

// Создаем пул подключений к базе данных
export const pool = new Pool(getDatabaseConfig());

// Создаем инстанс Drizzle ORM
export const db = drizzle(pool, { schema });

// Экспортируем тип базы данных для информации
export const dbType = getDatabaseType();

// Оборачиваем пул подключений для перехвата ошибок и логирования
export const wrappedPool = {
  query: async (text: string, params?: any[]) => {
    try {
      return await pool.query(text, params);
    } catch (error) {
      console.error(`[DB] Query error:`, error);
      throw error;
    }
  },
  connect: async () => {
    try {
      return await pool.connect();
    } catch (error) {
      console.error(`[DB] Connection error:`, error);
      throw error;
    }
  },
  end: async () => {
    try {
      return await pool.end();
    } catch (error) {
      console.error(`[DB] Error ending pool:`, error);
      throw error;
    }
  }
};

// Проверка соединения с базой данных
export async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now');
    const now = result.rows[0].now;
    client.release();
    
    console.log(`[DB] Successfully connected to ${dbType} database, server time:`, now);
    return { success: true, now, dbType };
  } catch (error) {
    console.error(`[DB] Connection test failed:`, error);
    return { success: false, error, dbType };
  }
}

// Проверка партиционирования таблицы транзакций
export async function isTablePartitioned() {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'p' 
        AND n.nspname = 'public' 
        AND c.relname = 'transactions'
      ) as is_partitioned;
    `);
    
    return result.rows[0]?.is_partitioned || false;
  } catch (error) {
    console.error("[DB] Error checking partitioning:", error);
    return false;
  }
}