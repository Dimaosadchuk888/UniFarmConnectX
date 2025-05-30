#!/usr/bin/env node

/**
 * Server startup script with database connection testing
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting UniFarm server...');

// Test database connection first
console.log('🔍 Testing database connection...');

try {
  // Import and test the unified database connection
  const { testConnection } = await import('./server/db-unified.js');
  const isConnected = await testConnection();
  
  if (isConnected) {
    console.log('✅ Database connection successful');
  } else {
    console.log('⚠️ Database connection failed, but continuing...');
  }
} catch (error) {
  console.log('⚠️ Database test error:', error.message);
  console.log('Continuing with server startup...');
}

// Start the server
console.log('🌟 Starting server with tsx...');

const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

serverProcess.on('error', (error) => {
  console.error('❌ Server startup error:', error);
});

serverProcess.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});