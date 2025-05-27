/**
 * Основний модуль підключення до бази даних
 * Експортує всі підключення з unified модуля для сумісності
 */

// Експортуємо з unified модуля для зворотної сумісності
export { 
  db, 
  pool,
  testConnection,
  reconnect
} from './db-connect-unified';

// Експортуємо production модуль як альтернативу
export { 
  getProductionDb, 
  getProductionPool, 
  queryProduction 
} from './production-db';

// Створюємо аліаси для зворотної сумісності
export { testConnection as testDatabaseConnection } from './db-connect-unified';