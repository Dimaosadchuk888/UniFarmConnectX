import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/pg-pool';
import * as schema from "../shared/schema";

// Проверка наличия переменной окружения DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Создаем пул подключений к PostgreSQL
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // максимальное количество клиентов в пуле
  idleTimeoutMillis: 30000, // время простоя, после которого клиент будет отключен
  connectionTimeoutMillis: 5000, // время ожидания подключения
});

// Обработка событий пула
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Инициализируем Drizzle с нашей схемой
export const db = drizzle(pool, { schema });

// Типизированный интерфейс для результатов SQL запросов
export interface QueryResult<T = any> {
  command: string;
  rowCount: number;
  oid: number;
  rows: T[];
  fields: any[];
}

// Обертка для выполнения SQL запросов напрямую (когда нужны системные запросы)
export const query = async <T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> => {
  try {
    const result = await pool.query(text, params);
    return {
      ...result,
      rowCount: result.rowCount || 0  // Гарантируем, что rowCount всегда будет числом
    };
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
};