import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

// Проверка наличия переменной окружения DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('[DB] Инициализация Replit PostgreSQL соединения');

// Настройки повторных попыток
const MAX_RETRIES = 5;
const INITIAL_BACKOFF = 200; // ms
const MAX_BACKOFF = 10000; // ms

// Функция для экспоненциальной задержки между попытками
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Функция для вычисления времени задержки с джиттером
const getBackoff = (retry: number) => {
  const baseBackoff = Math.min(MAX_BACKOFF, INITIAL_BACKOFF * Math.pow(2, retry));
  // Добавляем 20% джиттера, чтобы избежать "грозовых стад" - когда все клиенты пытаются переподключиться одновременно
  return baseBackoff * (0.8 + Math.random() * 0.4);
};

// Статус подключения к базе данных
export let dbConnectionStatus = 'disconnected';

// Создаем пул подключений к PostgreSQL
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5, // Ограничиваем максимальное количество соединений
  idleTimeoutMillis: 30000, // Время простоя до закрытия неиспользуемых соединений
  connectionTimeoutMillis: 10000, // Увеличенное время ожидания соединения
  allowExitOnIdle: false // Запрещаем завершение процесса при простое
});

// Обработка событий пула
pool.on('error', (err) => {
  console.error('[DB] Неожиданная ошибка в idle клиенте', err);
  dbConnectionStatus = 'error';
});

pool.on('connect', () => {
  console.log('[DB] Успешное подключение к Replit PostgreSQL');
  dbConnectionStatus = 'connected';
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

// Проверка состояния БД и тестовый запрос
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    await pool.query('SELECT 1');
    dbConnectionStatus = 'connected';
    return true;
  } catch (error) {
    dbConnectionStatus = 'error';
    const errorObj = error instanceof Error 
      ? error 
      : new Error(String(error));
    console.error('[DB] Тестовое подключение не удалось:', errorObj.message);
    return false;
  }
};

// Периодическая проверка соединения с БД (каждые 30 секунд)
setInterval(async () => {
  try {
    const isConnected = await testDatabaseConnection();
    if (isConnected && dbConnectionStatus !== 'connected') {
      console.log('[DB] Соединение с базой данных восстановлено');
    }
  } catch (error) {
    // Игнорируем ошибки в фоновой проверке
  }
}, 30000);

// Выполнить запрос с автоматическими повторными попытками
export const queryWithRetry = async <T = any>(
  text: string, 
  params: any[] = [],
  retries = MAX_RETRIES
): Promise<QueryResult<T>> => {
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await pool.query(text, params);
      // Если запрос выполнен успешно, обновляем статус соединения
      if (dbConnectionStatus !== 'connected') {
        dbConnectionStatus = 'connected';
        console.log('[DB] Соединение с базой данных восстановлено после успешного запроса');
      }
      return {
        ...result,
        rowCount: result.rowCount || 0
      };
    } catch (error) {
      lastError = error;
      
      // Преобразуем error в Error, чтобы гарантировать наличие message
      const errorObj = error instanceof Error 
        ? error 
        : new Error(String(error));
      
      // Проверяем, стоит ли делать повторную попытку
      if (
        attempt < retries && 
        (errorObj.message.includes('connection') ||
         errorObj.message.includes('timeout'))
      ) {
        // Ждем перед повторной попыткой с экспоненциальной задержкой
        const backoff = getBackoff(attempt);
        console.log(`[DB] Повторная попытка ${attempt + 1}/${retries} через ${Math.round(backoff)}ms`);
        await sleep(backoff);
        continue;
      }
      
      // Ошибка, не связанная с соединением, или исчерпаны все попытки
      break;
    }
  }
  
  // Обновляем статус соединения, если все попытки неудачны
  if (dbConnectionStatus !== 'error') {
    dbConnectionStatus = 'error';
    console.error('[DB] Все попытки подключения к базе данных неудачны');
  }
  
  throw lastError;
};

// Обертка для выполнения SQL запросов напрямую (когда нужны системные запросы)
export const query = async <T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> => {
  try {
    return await queryWithRetry<T>(text, params);
  } catch (error) {
    const errorObj = error instanceof Error 
      ? error 
      : new Error(String(error));
    console.error('[DB] Ошибка выполнения запроса:', errorObj.message);
    throw errorObj;
  }
};