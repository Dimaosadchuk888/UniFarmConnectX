/**
 * Clean Database Connection Module
 * Unified PostgreSQL connection for UniFarm
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

// Validate required environment variable
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required for database connection");
}

// Create PostgreSQL connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Create Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Database health check function
export async function checkDatabaseConnection() {
  try {
    const result = await pool.query('SELECT 1 as test');
    return { 
      connected: true, 
      test: result.rows[0]?.test === 1,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  await pool.end();
});

process.on('SIGINT', async () => {
  await pool.end();
});
