#!/usr/bin/env node
/**
 * UniFarm Deployment Entry Point
 * Routes to the correct production server for deployment compatibility
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 UniFarm Deployment Entry Point');
console.log('📦 Routing to production server...');

// Set production environment
process.env.NODE_ENV = 'production';
process.env.HOST = '0.0.0.0';
process.env.PORT = process.env.PORT || '3000';

// Verify critical environment variables
const requiredVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'TELEGRAM_BOT_TOKEN'];
const missing = requiredVars.filter(varName => !process.env[varName]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:', missing);
  console.error('Please set these variables in your deployment secrets');
  process.exit(1);
}

console.log('✅ Environment variables validated');
console.log(`🌐 Starting server on ${process.env.HOST}:${process.env.PORT}`);

// Start the actual server using tsx for TypeScript support
const serverProcess = spawn('npx', ['tsx', join(__dirname, 'server', 'index.ts')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    HOST: '0.0.0.0',
    PORT: process.env.PORT || '3000'
  }
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
  console.log('✅ Server shutdown complete');
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

console.log('🚀 UniFarm server started successfully');