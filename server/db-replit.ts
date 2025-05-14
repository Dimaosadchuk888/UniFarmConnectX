import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Константы для управления соединением с базой данных
const MAX_RETRIES = 3;
export let dbConnectionStatus: 'connected' | 'error' | 'initial' = 'initial';

// Вспомогательная функция для задержки
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Рассчитывает время задержки для повторных попыток с экспоненциальным увеличением
const getBackoff = (attempt: number) => Math.min(100 * Math.pow(2, attempt), 3000);

// Проверка наличия переменных окружения для PostgreSQL Replit
const requiredEnvVars = ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(`Отсутствуют необходимые переменные окружения для Replit PostgreSQL: ${missingVars.join(', ')}`);
}

// Создание пула соединений с PostgreSQL
export const pool = new Pool({
  // Используем строку подключения напрямую для поддержки всех параметров
  connectionString: process.env.DATABASE_URL,
  // Настройки SSL в зависимости от хоста
  ssl: process.env.PGHOST?.includes('neon.tech') 
    ? { rejectUnauthorized: true } // Для Neon DB требуется SSL
    : false // Для локального Replit SSL не требуется
});

// Создание экземпляра Drizzle ORM
export const db = drizzle(pool, { schema });

// Типизированный интерфейс для результатов SQL запросов
export interface QueryResult<T = any> {
  command: string;
  rowCount: number;
  oid: number;
  rows: T[];
  fields: any[];
}

// Проверка соединения с базой данных
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    await pool.query('SELECT 1');
    console.log('[DB-Replit] Соединение с PostgreSQL на Replit установлено');
    return true;
  } catch (error) {
    const errorObj = error instanceof Error 
      ? error 
      : new Error(String(error));
    console.error('[DB-Replit] Ошибка соединения с PostgreSQL на Replit:', errorObj.message);
    return false;
  }
};

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
        console.log('[DB-Replit] Соединение с базой данных восстановлено после успешного запроса');
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
        console.log(`[DB-Replit] Повторная попытка ${attempt + 1}/${retries} через ${Math.round(backoff)}ms`);
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
    console.error('[DB-Replit] Все попытки подключения к базе данных неудачны');
  }
  
  throw lastError;
};

// Выполнить SQL запрос с обработкой ошибок
export const query = async <T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> => {
  try {
    return await queryWithRetry<T>(text, params);
  } catch (error) {
    const errorObj = error instanceof Error 
      ? error 
      : new Error(String(error));
    console.error('[DB-Replit] Ошибка выполнения запроса:', errorObj.message);
    throw errorObj;
  }
};