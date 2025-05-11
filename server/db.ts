import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Константы для управления соединением с базой данных
const MAX_RETRIES = 3;
let dbConnectionStatus: 'connected' | 'error' | 'initial' = 'initial';

// Вспомогательная функция для задержки
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Рассчитывает время задержки для повторных попыток с экспоненциальным увеличением
const getBackoff = (attempt: number) => Math.min(100 * Math.pow(2, attempt), 3000);

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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
    // Используем тип ErrorWithMessage для безопасного доступа к свойству message
    type ErrorWithMessage = { message: string };
    
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
      // Используем тип ErrorWithMessage для безопасного доступа к свойству message
      type ErrorWithMessage = { message: string };
      
      const errorObj = error instanceof Error 
        ? error 
        : new Error(String(error));
      
      // Проверяем, стоит ли делать повторную попытку
      if (
        attempt < retries && 
        (errorObj.message.includes('endpoint is disabled') || 
         errorObj.message.includes('connection') ||
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
    // Используем тип ErrorWithMessage для безопасного доступа к свойству message
    type ErrorWithMessage = { message: string };
    
    const errorObj = error instanceof Error 
      ? error 
      : new Error(String(error));
    console.error('[DB] Ошибка выполнения запроса:', errorObj.message);
    throw errorObj;
  }
};