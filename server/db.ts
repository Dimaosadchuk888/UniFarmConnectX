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