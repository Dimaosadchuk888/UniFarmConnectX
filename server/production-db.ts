/**
 * ПЕРЕНАПРАВЛЕННЯ НА ЄДИНИЙ МОДУЛЬ ПІДКЛЮЧЕННЯ
 * Всі підключення тепер йдуть через single-db-connection.ts
 */

// Імпортуємо з єдиного модуля
export { 
  getSingleDbConnection as getProductionDb, 
  getSinglePool as getProductionPool,
  querySingleDb as queryProduction
} from './single-db-connection';