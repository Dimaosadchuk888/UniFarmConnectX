/**
 * Main Database Connection Module
 * Uses unified database connection to resolve conflicts
 */

// Import from unified connection module
export { 
  getDb as db,
  getPool as pool,
  query as queryDb,
  testConnection as testDatabaseConnection,
  getConnectionStatus,
  dbType
} from './db-unified';

// Compatibility exports
export { 
  getDb as getProductionDb, 
  getPool as getProductionPool,
  query as queryProduction
} from './db-unified';

// Additional utility functions
export async function reconnect() {
  try {
    const { getPool } = await import('./db-unified');
    const pool = await getPool();
    return { success: true, pool };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}