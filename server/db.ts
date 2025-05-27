/**
 * Основний модуль підключення до бази даних
 * Експортує всі підключення з unified модуля для сумісності
 */

// Експортуємо з unified модуля для зворотної сумісності
export { 
  db, 
  pool
} from './db-connect-unified';

// Експортуємо production модуль як альтернативу
export { 
  getProductionDb, 
  getProductionPool, 
  queryProduction 
} from './production-db';

// Додаткові експорти для сумісності з middleware
export async function testDatabaseConnection() {
  try {
    const { queryProduction } = await import('./production-db');
    const result = await queryProduction('SELECT 1');
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function reconnect() {
  try {
    // Використовуємо production базу для переподключення
    const { getProductionPool } = await import('./production-db');
    const pool = await getProductionPool();
    return { success: true, pool };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}