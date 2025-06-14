#!/usr/bin/env node

/**
 * UniFarm Stable Production Server
 * Direct import of the main server for deployment compatibility
 */

// Set production environment
process.env.NODE_ENV = 'production';
process.env.HOST = '0.0.0.0';
process.env.PORT = process.env.PORT || '3000';
process.env.DATABASE_PROVIDER = 'neon';
process.env.FORCE_NEON_DB = 'true';
process.env.DISABLE_REPLIT_DB = 'true';

console.log('Starting UniFarm production server...');
console.log(`Port: ${process.env.PORT}`);
console.log(`Host: ${process.env.HOST}`);

// Import and start the main server
import('./server/index.ts').catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});