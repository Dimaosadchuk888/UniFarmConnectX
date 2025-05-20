/**
 * Модуль-адаптер для совместимости нового интерфейса БД с существующим кодом
 * 
 * Этот модуль обеспечивает плавную миграцию с db-selector на новый db-connect-unified,
 * сохраняя обратную совместимость с существующим кодом.
 */

import { Pool, QueryResult } from 'pg';
import { 
  pool, 
  db, 
  dbType, 
  testConnection, 
  queryWithRetry, 
  getConnectionStatus,
  DatabaseType 
} from './db';

// Объект для отслеживания состояния подключения к базе данных (совместимость)
export const dbConnectionStatus = {
  lastSuccessful: null as Date | null,
  lastFailed: null as Date | null,
  lastError: null as Error | null,
  isConnected: false,
  consecutiveFailures: 0,

  // Метод для обновления статуса соединения
  async update() {
    try {
      const isConnected = await testConnection();
      this.isConnected = isConnected;
      
      if (isConnected) {
        this.lastSuccessful = new Date();
        this.consecutiveFailures = 0;
      } else {
        this.lastFailed = new Date();
        this.consecutiveFailures++;
      }
      
      return isConnected;
    } catch (error) {
      this.isConnected = false;
      this.lastFailed = new Date();
      this.lastError = error as Error;
      this.consecutiveFailures++;
      return false;
    }
  }
};

// Оборачиваем пул подключений для перехвата ошибок и логирования (для обратной совместимости)
export const wrappedPool = {
  query: async (text: string, params?: any[]): Promise<QueryResult> => {
    try {
      return await queryWithRetry(text, params, 3);
    } catch (error) {
      console.error(`[DB Adapter] Query error:`, error);
      throw error;
    }
  },
  connect: async () => {
    try {
      return await pool.connect();
    } catch (error) {
      console.error(`[DB Adapter] Connection error:`, error);
      throw error;
    }
  },
  end: async () => {
    try {
      return await pool.end();
    } catch (error) {
      console.error(`[DB Adapter] Error ending pool:`, error);
      throw error;
    }
  }
};

// Тип результата проверки соединения
export type TestDatabaseConnectionResult = {
  success: boolean;
  now?: any;
  error?: unknown;
  dbType: DatabaseType;
};

// Функция тестирования соединения (совместимая с оригинальной)
export async function testDatabaseConnection(): Promise<TestDatabaseConnectionResult> {
  try {
    const isConnected = await testConnection();
    
    if (isConnected) {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as now');
      const now = result.rows[0].now;
      client.release();
      
      console.log(`[DB Adapter] Successfully connected to ${dbType} database, server time:`, now);
      return { success: true, now, dbType };
    } else {
      throw new Error('Database connection test failed');
    }
  } catch (error) {
    console.error(`[DB Adapter] Connection test failed:`, error);
    return { success: false, error, dbType };
  }
}

// Проверка партиционирования таблицы транзакций
export async function isTablePartitioned() {
  try {
    const result = await queryWithRetry(`
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
    console.error("[DB Adapter] Error checking partitioning:", error);
    return false;
  }
}

// Экспортируем все необходимые переменные и функции для обратной совместимости
export { pool, db, DatabaseType, dbType, queryWithRetry };