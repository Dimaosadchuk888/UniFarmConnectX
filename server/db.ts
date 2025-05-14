/**
 * Модуль подключения к Neon DB
 * 
 * Этот модуль обеспечивает подключение к Neon DB через Drizzle ORM
 * Внимание: В этом режиме используется ТОЛЬКО Neon DB, независимо от настроек среды
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../shared/schema';

// Проверяем наличие строки подключения к Neon DB
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in the environment variables');
}

console.log('[DB-NEON] 🚀 Инициализация Neon DB соединения');

// Создаем пул соединений с Neon DB
let pool: Pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Необходимо для Neon DB
  },
  max: 20, // максимальное количество клиентов в пуле
  idleTimeoutMillis: 30000, // время ожидания перед закрытием неиспользуемых соединений
  connectionTimeoutMillis: 8000, // время ожидания при подключении нового клиента
});

console.log('[DB-NEON] Соединение с Neon DB инициализировано');

// Устанавливаем обработчики событий для пула соединений
pool.on('error', (err) => {
  console.error('[DB] Произошла ошибка пула:', err.message);
  console.error(err.stack);
});

pool.on('connect', () => {
  console.log('[DB] Новое соединение установлено');
});

// Создаем и экспортируем Drizzle ORM
export const db = drizzle(pool, { schema });

// Экспортируем пул соединений для случаев, где нужен прямой доступ
export { pool };

// Функция для выполнения SQL-запросов напрямую
export async function query(text: string, params?: any[]) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error: any) {
    console.error(`[DB] Ошибка выполнения запроса: ${text}`, error);
    throw error;
  }
}

// Функция для выполнения SQL-запросов с повторными попытками
export async function queryWithRetry(text: string, params?: any[], retries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await pool.query(text, params);
      return result;
    } catch (error: any) {
      lastError = error;
      console.error(`[DB] Попытка ${attempt + 1}/${retries} не удалась: ${error.message}`);
      
      if (attempt < retries - 1) {
        console.log(`[DB] Повторная попытка через ${delay}мс...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Текущий статус соединения с базой данных
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
    } catch (error: any) {
      this.isConnected = false;
      this.error = error;
    }
    return this.isConnected;
  }
};

// Функция для тестирования соединения с базой данных
export async function testDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW() as time');
    return {
      success: true,
      timestamp: result.rows[0].time,
      message: 'Соединение с базой данных успешно установлено'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Ошибка соединения с базой данных: ${error.message}`
    };
  }
}

// Инициализируем статус соединения
dbConnectionStatus.update().then((isConnected) => {
  if (isConnected) {
    console.log('✅ [DB] Соединение успешно установлено при запуске');
  } else {
    console.error('❌ [DB] Не удалось установить соединение при запуске');
    console.error('Ошибка:', dbConnectionStatus.error?.message);
  }
});