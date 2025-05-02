import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "../shared/schema";
import ws from "ws";

// Настройка WebSocket для Neon Serverless
neonConfig.webSocketConstructor = ws;

// Проверка наличия переменной окружения DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('[DB] Инициализация Neon PostgreSQL соединения через serverless драйвер');

// Создаем пул подключений к PostgreSQL используя Neon Serverless
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Обработка событий пула
pool.on('error', (err) => {
  console.error('[DB] Неожиданная ошибка в idle клиенте', err);
});

// Экспортируем инстанс drizzle для работы с схемой
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