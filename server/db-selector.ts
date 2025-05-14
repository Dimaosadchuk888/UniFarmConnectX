import * as replitDb from './db-replit';

// Тип поддерживаемых провайдеров БД
type DatabaseProvider = 'replit' | 'neon' | 'default';

// Текущий провайдер БД
let currentProvider: DatabaseProvider = 'replit';

// Принудительно используем только PostgreSQL от Replit
console.log('[DB-Selector] Принудительное использование Replit PostgreSQL');

/**
 * Устанавливает провайдера базы данных
 * @param provider Провайдер БД ('replit', 'neon', 'default')
 * @returns Имя выбранного провайдера
 */
export function setDatabaseProvider(provider: DatabaseProvider): DatabaseProvider {
  // Для обратной совместимости, но всегда используем Replit
  currentProvider = 'replit';
  console.log(`[DB-Selector] Установлен провайдер БД: ${currentProvider} (запрошен: ${provider})`);
  return currentProvider;
}

// Возвращает текущего провайдера БД
export function getDatabaseProvider(): DatabaseProvider {
  return currentProvider;
}

// Экспортируем модуль Replit PostgreSQL
export const { 
  pool, 
  db, 
  testDatabaseConnection, 
  query,
  queryWithRetry,
  dbConnectionStatus
} = replitDb;

// Экспортируем также типы
export type { QueryResult } from './db-replit';