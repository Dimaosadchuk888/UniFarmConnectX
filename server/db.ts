/**
 * Централизованный экспорт всех компонентов для работы с базой данных
 * Консолидирует экспорты из db-config.ts, db-connect-unified.ts, db-health-monitor.ts
 */

// Экспортируем компоненты подключения
export {
  pool,
  db,
  dbType,
  reconnect,
  testConnection,
  getConnectionStatus,
  getMonitorStats,
  queryWithRetry
} from './db-connect-unified';

// Экспортируем типы и конфигурацию
export {
  DatabaseType,
  SSLMode,
  getDbConfig,
  getDatabaseType
} from './db-config';

// Экспортируем компоненты мониторинга
export {
  ConnectionStatus
} from './db-health-monitor';