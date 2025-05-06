/**
 * Стандартизированный модуль для работы с базой данных
 * 
 * Этот файл реализует централизованный доступ к базе данных PostgreSQL через Drizzle ORM.
 * Он обеспечивает единую точку доступа к базе, управление соединениями, обработку ошибок
 * и обеспечивает устойчивость при временных проблемах с подключением.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";
import ws from "ws";

// Настройка WebSocket для Neon Serverless
neonConfig.webSocketConstructor = ws;

// Проверка наличия переменной окружения DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Настройки повторных попыток подключения
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

// Тип для статуса подключения к базе данных
export type DbConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

// Состояние подключения
export interface DbState {
  connectionStatus: DbConnectionStatus;
  usingInMemoryStorage: boolean;
  lastConnectionAttempt: string;
  reconnectingMode: boolean;
  lastError?: Error;
  warning?: string;
}

// Статус подключения к базе данных
export let dbState: DbState = {
  connectionStatus: 'disconnected',
  usingInMemoryStorage: false,
  lastConnectionAttempt: new Date().toISOString(),
  reconnectingMode: false
};

// Создаем пул подключений к PostgreSQL с улучшенной устойчивостью
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
  dbState.connectionStatus = 'error';
  dbState.lastError = err instanceof Error ? err : new Error(String(err));
});

pool.on('connect', () => {
  console.log('[DB] Успешное подключение к PostgreSQL');
  dbState.connectionStatus = 'connected';
  dbState.usingInMemoryStorage = false;
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

/**
 * Проверка состояния БД и тестовый запрос
 * @returns Promise<boolean> true, если соединение работает
 */
export const testDatabaseConnection = async (): Promise<boolean> => {
  dbState.lastConnectionAttempt = new Date().toISOString();
  dbState.connectionStatus = 'connecting';
  
  try {
    await pool.query('SELECT 1');
    dbState.connectionStatus = 'connected';
    dbState.usingInMemoryStorage = false;
    return true;
  } catch (error) {
    dbState.connectionStatus = 'error';
    const errorObj = error instanceof Error 
      ? error 
      : new Error(String(error));
    
    dbState.lastError = errorObj;
    console.error('[DB] Тестовое подключение не удалось:', errorObj.message);
    return false;
  }
};

// Периодическая проверка соединения с БД (каждые 30 секунд)
setInterval(async () => {
  try {
    const isConnected = await testDatabaseConnection();
    if (isConnected && dbState.connectionStatus !== 'connected') {
      console.log('[DB] Соединение с базой данных восстановлено');
      dbState.warning = undefined;
      dbState.reconnectingMode = false;
    }
  } catch (error) {
    // Игнорируем ошибки в фоновой проверке
  }
}, 30000);

/**
 * Выполнить запрос с автоматическими повторными попытками
 * @param text SQL запрос
 * @param params Параметры запроса
 * @param retries Количество повторных попыток
 * @returns Promise<QueryResult<T>> Результат запроса
 */
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
      if (dbState.connectionStatus !== 'connected') {
        dbState.connectionStatus = 'connected';
        dbState.usingInMemoryStorage = false;
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
  if (dbState.connectionStatus !== 'error') {
    dbState.connectionStatus = 'error';
    dbState.reconnectingMode = true;
    console.error('[DB] Все попытки подключения к базе данных неудачны');
  }
  
  throw lastError;
};

/**
 * Обертка для выполнения SQL запросов напрямую (когда нужны системные запросы)
 * @param text SQL запрос
 * @param params Параметры запроса
 * @returns Promise<QueryResult<T>> Результат запроса
 */
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

/**
 * Транзакции через Drizzle ORM
 * @param fn Функция, выполняемая в транзакции
 * @returns Promise<T> Результат транзакции
 */
export const transaction = async <T>(fn: (tx: typeof db) => Promise<T>): Promise<T> => {
  try {
    return await db.transaction(async (tx) => {
      return await fn(tx);
    });
  } catch (error) {
    const errorObj = error instanceof Error 
      ? error 
      : new Error(String(error));
    console.error('[DB] Ошибка выполнения транзакции:', errorObj.message);
    throw errorObj;
  }
};

// Выполняем тестовое подключение при инициализации модуля
testDatabaseConnection()
  .then((isConnected) => {
    if (isConnected) {
      console.log('[DB] 🟢 База данных успешно инициализирована и готова к работе');
    } else {
      console.warn('[DB] 🟠 База данных недоступна, будет использоваться резервное хранилище');
      dbState.usingInMemoryStorage = true;
      dbState.warning = 'База данных недоступна, используется резервное хранилище';
    }
  })
  .catch((error) => {
    console.error('[DB] 🔴 Критическая ошибка при инициализации базы данных:', error);
    dbState.usingInMemoryStorage = true;
    dbState.lastError = error instanceof Error ? error : new Error(String(error));
  });

/**
 * Получение текущего состояния подключения к базе данных
 * @returns DbState Текущее состояние
 */
export const getDatabaseState = (): DbState => {
  return { ...dbState };
};