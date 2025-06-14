/**
 * Clean Database Connection Module
 * Unified PostgreSQL connection for UniFarm
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

// BLOCK ALL NEON VARIABLES COMPLETELY
delete process.env.PGHOST;
delete process.env.PGUSER; 
delete process.env.PGDATABASE;
delete process.env.PGPASSWORD;
delete process.env.PGPORT;
delete process.env.DATABASE_PROVIDER;

// Reject any DATABASE_URL containing Neon references
if (process.env.DATABASE_URL && (
    process.env.DATABASE_URL.includes('neon.tech') || 
    process.env.DATABASE_URL.includes('neondb') ||
    process.env.DATABASE_URL.includes('ep-rough-boat')
)) {
  console.log('BLOCKING NEON DATABASE_URL');
  delete process.env.DATABASE_URL;
}

// Use in-memory database if no DATABASE_URL provided
if (!process.env.DATABASE_URL) {
  console.log('Using in-memory database - provide DATABASE_URL for persistent storage');
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/memory';
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
