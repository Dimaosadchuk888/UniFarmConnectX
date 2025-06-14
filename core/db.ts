/**
 * Database connection module - Clean PostgreSQL connection
 * Unified database connection for production deployment
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

// Validate database URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Create Drizzle instance
export const db = drizzle(pool, { schema });

// Connection health check
export async function checkDatabaseConnection() {
  try {
    const result = await pool.query('SELECT 1 as test');
    return { connected: true, test: result.rows[0]?.test === 1 };
  } catch (error) {
    return { connected: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  pool.end();
});

process.on('SIGINT', () => {
  pool.end();
});
