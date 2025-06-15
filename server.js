#!/usr/bin/env node

/**
 * UniFarm Deployment Entry Point
 * Routes to npm start script for proper TypeScript execution
 */

import { spawn } from 'child_process';

// Set production environment
process.env.NODE_ENV = 'production';
process.env.HOST = '0.0.0.0';
process.env.PORT = process.env.PORT || '3000';

console.log('🚀 UniFarm Starting via npm start...');
console.log('📦 Environment: production');
console.log('🔧 Using npm start script for proper TypeScript execution');

// Use npm start script which is properly configured
const serverProcess = spawn('npm', ['start'], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: process.env
});

// Handle startup errors
serverProcess.on('error', (error) => {
  console.error('❌ Server startup error:', error.message);
  process.exit(1);
});

// Handle server exit
serverProcess.on('exit', (code) => {
  if (code === 0) {
    console.log('✅ Server shutdown correctly');
  } else {
    console.error(`❌ Server exited with code: ${code}`);
    process.exit(code);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Received SIGTERM, shutting down server...');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🔄 Received SIGINT, shutting down server...');
  serverProcess.kill('SIGINT');
});