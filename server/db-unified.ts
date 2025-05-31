/**
 * Unified Database Connection Module
 * Resolves conflicts between multiple database connection files
 */

import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../shared/schema.js';

// Database connection state
let globalPool: Pool | null = null;
let globalDb: NodePgDatabase<typeof schema> | null = null;
let connectionStatus: 'connected' | 'error' | 'connecting' = 'connecting';

// Get connection string from environment
function getConnectionString(): string {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return dbUrl;
}

// Create database pool with proper configuration
function createPool(): Pool {
  const connectionString = getConnectionString();
  
  return new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

// Initialize database connection
async function initializeConnection(): Promise<void> {
  if (globalPool && globalDb) {
    return;
  }

  try {
    connectionStatus = 'connecting';
    console.log('[DB] Initializing unified database connection...');
    
    globalPool = createPool();
    globalDb = drizzle(globalPool, { schema });

    // Test connection
    const testClient = await globalPool.connect();
    try {
      const result = await testClient.query('SELECT COUNT(*) as count FROM users');
      const userCount = parseInt(result.rows[0].count);
      console.log(`[DB] Connected successfully! Users: ${userCount}`);
      connectionStatus = 'connected';
    } finally {
      testClient.release();
    }
  } catch (error) {
    connectionStatus = 'error';
    console.error('[DB] Connection failed:', error);
    throw error;
  }
}

// Get database instance (Drizzle ORM)
export async function getDb(): Promise<NodePgDatabase<typeof schema>> {
  if (!globalDb) {
    await initializeConnection();
  }
  return globalDb!;
}

// Get pool instance
export async function getPool(): Promise<Pool> {
  if (!globalPool) {
    await initializeConnection();
  }
  return globalPool!;
}

// Get client from pool
export async function getClient(): Promise<PoolClient> {
  const pool = await getPool();
  return pool.connect();
}

// Execute raw SQL query
export async function query<T = any>(text: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
  const pool = await getPool();
  return pool.query(text, params);
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('[DB] Connection test failed:', error);
    return false;
  }
}

// Get connection status
export function getConnectionStatus() {
  return {
    status: connectionStatus,
    isConnected: connectionStatus === 'connected',
    isMemoryMode: false,
    dbType: 'postgres'
  };
}

// Export aliases for compatibility
export const db = getDb;
export const pool = getPool;
export const dbType = 'postgres';

// Clean shutdown
export async function closeConnection(): Promise<void> {
  if (globalPool) {
    await globalPool.end();
    globalPool = null;
    globalDb = null;
    connectionStatus = 'connecting';
    console.log('[DB] Connection closed');
  }
}

// Handle process termination
process.on('SIGINT', closeConnection);
process.on('SIGTERM', closeConnection);