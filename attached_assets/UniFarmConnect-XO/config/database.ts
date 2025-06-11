export const databaseConfig = {
  provider: process.env.DATABASE_PROVIDER || 'neon',
  url: process.env.DATABASE_URL || '',
  ssl: process.env.NODE_ENV === 'production',
  maxConnections: 20,
  connectionTimeout: 30000
};