/**
 * Модуль подключения к базе данных PostgreSQL
 * 
 * Этот модуль обеспечивает надежное подключение к PostgreSQL с 
 * возможностью автоматического восстановления соединения.
 * Устранены циклические зависимости между модулями мониторинга и подключения.
 */

import { Pool, QueryResult } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';
import { getDbConfig, getDatabaseType, DatabaseType } from './db-config';
import { DatabaseMonitor, ConnectionStatus } from './db-health-monitor';

// Состояние подключения к БД
export const dbState = {
  usingInMemoryStorage: false,
  lastConnectionAttempt: 0,
  connectionErrorCount: 0
};

// Создаем пул подключений к базе данных с настройками из db-config
export let pool = new Pool(getDbConfig());

// Создаем экземпляр Drizzle ORM с пулом подключений
export let db = drizzle(pool, { schema });

// Определяем тип базы данных для информации
export const dbType = getDatabaseType();

// Создаем экземпляр мониторинга с пулом подключений
export const dbMonitor = new DatabaseMonitor(pool);

// Запускаем мониторинг
dbMonitor.start();

// Регистрируем обработчик события переподключения
dbMonitor.onReconnect((newPool) => {
  console.log('[DB Connect] Обновляем пул и Drizzle после переподключения');
  
  // Обновляем глобальную переменную pool
  pool = newPool;
  
  // Обновляем экземпляр Drizzle ORM
  db = drizzle(newPool, { schema });
});

/**
 * Проверяет соединение с базой данных
 * @returns Promise<boolean> Результат проверки
 */
export async function testConnection(): Promise<boolean> {
  return await dbMonitor.checkConnection();
}

/**
 * Инициирует процесс переподключения к базе данных
 * @returns Promise<boolean> Результат переподключения
 */
export async function reconnect(): Promise<boolean> {
  return await dbMonitor.attemptReconnect();
}

/**
 * Получает текущий статус соединения с базой данных
 * @returns ConnectionStatus Текущий статус соединения
 */
export function getConnectionStatus(): ConnectionStatus {
  return dbMonitor.getStatus();
}

/**
 * Получает статистику мониторинга соединения
 * @returns Объект со статистикой
 */
export function getMonitorStats() {
  return dbMonitor.getStats();
}

/**
 * Выполняет SQL-запрос с автоматическим повторением при ошибках соединения
 * 
 * @param query SQL-запрос
 * @param params Параметры запроса
 * @param retries Количество попыток при ошибке
 * @param delayMs Задержка между попытками в мс
 * @returns Promise<QueryResult<any>> Результат запроса
 */
export async function queryWithRetry(
  query: string,
  params: any[] = [],
  retries = 3,
  delayMs = 1000
): Promise<QueryResult<any>> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(query, params);
        return result;
      } finally {
        client.release();
      }
    } catch (error: any) {
      // Проверка на ошибки соединения
      const isConnectionError = error.message.includes('connection') || 
                             error.message.includes('socket') ||
                             error.message.includes('timeout') ||
                             error.code === 'ECONNREFUSED' ||
                             error.code === 'ETIMEDOUT' ||
                             error.code === '57P01'; // SQL state code for admin shutdown
      
      if (isConnectionError && attempt < retries) {
        console.warn(`[DB] ⚠️ Ошибка соединения при выполнении запроса (попытка ${attempt + 1}/${retries}): ${error.message}`);
        
        // Пробуем переподключиться при первой ошибке
        if (attempt === 0) {
          await reconnect();
        }
        
        // Ждем перед следующей попыткой (экспоненциальная задержка)
        const waitTime = delayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Другие ошибки или исчерпаны попытки
      throw error;
    }
  }
  
  throw new Error(`Не удалось выполнить запрос после ${retries} попыток`);
}