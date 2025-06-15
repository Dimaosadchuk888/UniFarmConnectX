#!/usr/bin/env node
/**
 * UniFarm Production Server - Clean Supabase Implementation
 * Uses only DATABASE_URL environment variable for database connection
 * No legacy database provider variables or Neon references
 */

import { spawn } from 'child_process';

// Clean production environment setup - Supabase only
process.env.NODE_ENV = 'production';
process.env.HOST = '0.0.0.0';
process.env.PORT = process.env.PORT || '3000';

console.log('Starting UniFarm production server with Supabase...');
console.log(`Port: ${process.env.PORT}`);
console.log(`Host: ${process.env.HOST}`);
console.log(`Database: PostgreSQL via Supabase API only`);

// Verify required environment variables
const requiredVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'TELEGRAM_BOT_TOKEN'];
const missing = requiredVars.filter(varName => !process.env[varName]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:', missing);
  process.exit(1);
}

console.log('✅ All required environment variables present');

// Start server with tsx runtime for TypeScript support
const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: process.env
});

// Handle server process events
serverProcess.on('error', (error) => {
  console.error('❌ Server startup error:', error.message);
  process.exit(1);
});

serverProcess.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}, signal ${signal}`);
    process.exit(code || 1);
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully...');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🔄 Received SIGINT, shutting down gracefully...');
  serverProcess.kill('SIGINT');
});

console.log('🚀 Production server started successfully');