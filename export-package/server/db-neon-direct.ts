/**
 * Прямое подключение к Neon DB без использования селектора
 * 
 * Этот файл обеспечивает прямое подключение к Neon DB, минуя
 * логику выбора провайдера. Используется для сценариев, когда
 * необходимо гарантировать работу именно с Neon DB.
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

// Проверка наличия переменной окружения DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error("⚠️ DATABASE_URL не установлен!");
  throw new Error(
    "DATABASE_URL must be set for Neon DB connection. Did you forget to provision a database?",
  );
}

// Проверка корректности URL (должен содержать neon)
if (!process.env.DATABASE_URL.includes('neon')) {
  console.warn("⚠️ DATABASE_URL не содержит 'neon' - возможно, это не Neon DB?");
}

console.log('[NeonDB] Инициализация прямого подключения к Neon PostgreSQL');

// Создаем пул подключений к Neon PostgreSQL
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: {
    rejectUnauthorized: false // Для Neon DB нужен SSL
  }
});

// Обработка ошибок пула
pool.on('error', (err: Error) => {
  console.error('[NeonDB] Неожиданная ошибка в idle клиенте', err);
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

// Обертка для выполнения SQL запросов напрямую
export const query = async <T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> => {
  try {
    const result = await pool.query(text, params);
    return {
      ...result,
      rowCount: result.rowCount || 0  // Гарантируем, что rowCount всегда будет числом
    };
  } catch (error) {
    console.error('[NeonDB] Error executing query:', error);
    throw error;
  }
};

// Функция с повторными попытками выполнения запроса
export const queryWithRetry = async <T = any>(
  text: string, 
  params: any[] = [], 
  retries = 3, 
  delay = 1000
): Promise<QueryResult<T>> => {
  let lastError;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await query(text, params);
    } catch (error: any) {
      lastError = error;
      console.error(`[NeonDB] Попытка ${attempt + 1}/${retries} не удалась: ${error.message}`);
      
      if (attempt < retries - 1) {
        console.log(`[NeonDB] Повторная попытка через ${delay}мс...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

// Статус соединения с базой данных
export const dbConnectionStatus = {
  isConnected: false,
  lastConnectionAttempt: null as Date | null,
  error: null as Error | null,
  
  // Обновляем статус соединения
  async update() {
    this.lastConnectionAttempt = new Date();
    try {
      await pool.query('SELECT 1');
      this.isConnected = true;
      this.error = null;
      console.log('[NeonDB] Соединение с базой данных восстановлено после успешного запроса');
    } catch (error: any) {
      this.isConnected = false;
      this.error = error;
      console.error('[NeonDB] Не удалось подключиться к базе данных:', error.message);
    }
    return this.isConnected;
  }
};

// Функция для тестирования соединения с базой данных
export async function testDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW() as time');
    console.log(`[NeonDB] Соединение успешно: ${result.rows[0].time}`);
    return {
      success: true,
      timestamp: result.rows[0].time,
      message: 'Соединение с Neon DB успешно установлено'
    };
  } catch (error: any) {
    console.error(`[NeonDB] Ошибка подключения: ${error.message}`);
    return {
      success: false,
      message: `Ошибка соединения с Neon DB: ${error.message}`
    };
  }
}

// Инициализируем статус соединения
dbConnectionStatus.update().then((isConnected) => {
  if (isConnected) {
    console.log('✅ [NeonDB] Соединение успешно установлено при запуске');
  } else {
    console.error('❌ [NeonDB] Не удалось установить соединение при запуске');
    console.error('Ошибка:', dbConnectionStatus.error?.message);
  }
});