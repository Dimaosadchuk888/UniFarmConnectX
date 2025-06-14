/**
 * Database connection module - Supabase PostgreSQL connection
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

console.log('🔄 [DB] Initializing Supabase PostgreSQL connection');

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set for Supabase connection");
}

// Log connection details for debugging
console.log('🔍 [DB] DATABASE_URL detected:', process.env.DATABASE_URL?.substring(0, 30) + '...');

// Supabase PostgreSQL connection
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export const db = drizzle(pool, { schema });

console.log('✅ [DB] Supabase PostgreSQL connection initialized');

// Connection verification
async function verifySupabaseConnection() {
  try {
    console.log('🔍 [DB] Verifying Supabase connection...');
    const result = await pool.query('SELECT current_database(), current_schema(), inet_server_addr(), version()');
    console.log('✅ [DB] Supabase connection successful:');
    console.log('  - Database:', result.rows[0].current_database);
    console.log('  - Schema:', result.rows[0].current_schema);
    console.log('  - Server IP:', result.rows[0].inet_server_addr);
    console.log('  - PostgreSQL Version:', result.rows[0].version?.substring(0, 50) + '...');
  } catch (error) {
    console.error('❌ [DB] Supabase connection failed:', error.message);
  }
}

// Run verification after initialization
setTimeout(verifySupabaseConnection, 2000);