// Экспортируем все необходимые компоненты из db-selector.ts
export {
  pool,
  db,
  wrappedPool,
  testDatabaseConnection,
  dbType,
  DatabaseType,
  dbConnectionStatus,
  isTablePartitioned,
  queryWithRetry // Экспортируем queryWithRetry из db-selector.ts
} from './db-selector';