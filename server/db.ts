// Экспортируем все необходимые компоненты из db-selector.ts
export {
  pool,
  db,
  wrappedPool,
  testDatabaseConnection,
  dbType,
  DatabaseType,
  dbConnectionStatus,
  isTablePartitioned
} from './db-selector';

/**
 * Выполняет SQL запрос с поддержкой повторных попыток при ошибках
 * @param {string} query - SQL запрос
 * @param {any[]} params - Параметры запроса
 * @param {number} maxRetries - Максимальное количество попыток
 * @returns {Promise<any>} - Результат запроса
 */
export async function queryWithRetry(query: string, params: any[] = [], maxRetries: number = 3): Promise<any> {
  let retries = 0;
  let lastError;
  
  while (retries < maxRetries) {
    try {
      const { pool } = require('./db-selector');
      const result = await pool.query(query, params);
      return result;
    } catch (error) {
      lastError = error;
      retries++;
      if (retries < maxRetries) {
        // Ждем перед следующей попыткой (увеличиваем время ожидания с каждой попыткой)
        const delay = 500 * retries;
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`[DB] Повторная попытка запроса ${retries}/${maxRetries}...`);
      }
    }
  }
  
  throw lastError;
}