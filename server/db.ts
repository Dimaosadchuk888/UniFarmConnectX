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
  queryWithRetry,
  dbMonitor
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

// Экспортируем интерфейс dbConnectionStatus для совместимости
import { dbMonitor as monitor } from './db-connect-unified';

export const dbConnectionStatus = {
  status: 'ok' as 'ok' | 'error' | 'reconnecting',
  error: null as Error | null,
  lastCheckedAt: new Date(),
  
  async update() {
    try {
      const result = await monitor.checkConnection();
      this.status = monitor.getStatus();
      this.lastCheckedAt = new Date();
      return result;
    } catch (error) {
      this.error = error instanceof Error ? error : new Error(String(error));
      this.status = 'error' as 'ok' | 'error' | 'reconnecting';
      return false;
    }
  }
};