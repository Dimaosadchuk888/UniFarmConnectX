/**
 * Централизованный экспорт всех компонентов для работы с базой данных
 * Консолидирует экспорты из db-config.ts, db-connect-unified.ts, db-health-monitor.ts
 */

import { testConnection as testConn } from './db-connect-unified';
import { DatabaseType, getDatabaseType } from './db-config';

/**
 * Функция совместимости для поддержки старого формата проверки соединения
 * @returns Promise<{success: boolean, dbType: string}>
 */
export async function testDatabaseConnection() {
  const isConnected = await testConn();
  return { 
    success: isConnected, 
    dbType: getDatabaseType() 
  };
}

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
export type { ConnectionStatus } from './db-health-monitor';