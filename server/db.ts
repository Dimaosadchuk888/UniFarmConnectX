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