/**
 * Database Configuration for UniFarm
 * Centralized database connection settings
 */

export const databaseConfig = {
  // Database connection URL (Supabase PostgreSQL)
  url: process.env.DATABASE_URL || '',
  
  // Connection pool settings
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    idle: parseInt(process.env.DB_POOL_IDLE || '10000'),
    acquire: parseInt(process.env.DB_POOL_ACQUIRE || '60000'),
    evict: parseInt(process.env.DB_POOL_EVICT || '1000')
  },
  
  // Database provider settings
  provider: process.env.DATABASE_PROVIDER || 'supabase',
  
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // Connection timeout settings
  timeout: parseInt(process.env.DB_TIMEOUT || '30000'),
  
  // Schema settings
  schema: process.env.DB_SCHEMA || 'public'
};