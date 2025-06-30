#!/usr/bin/env node

/**
 * Development Server for UniFarm - Replit Preview Mode
 * Allows running without Telegram authorization
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting UniFarm Development Server (Replit Preview Mode)...');
console.log('✅ Authorization bypass enabled for development');
console.log('🔧 Guest/Demo mode active');

// Environment setup for development
process.env.NODE_ENV = 'development';
process.env.BYPASS_AUTH = 'true';
process.env.PORT = process.env.PORT || '3000';
process.env.HOST = process.env.HOST || '0.0.0.0';

// Start the TypeScript server directly
const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    BYPASS_AUTH: 'true',
    PORT: '3000',
    HOST: '0.0.0.0'
  }
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`Server process exited with code ${code}`);
  if (code !== 0) {
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  serverProcess.kill('SIGINT');
});