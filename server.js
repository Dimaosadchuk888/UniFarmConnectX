#!/usr/bin/env node

/**
 * UniFarm Production Entry Point
 * Fixes critical MODULE_NOT_FOUND error for Replit deployment
 */

const { spawn } = require('child_process');
const path = require('path');

// Set production environment
process.env.NODE_ENV = 'production';
process.env.HOST = '0.0.0.0';
process.env.PORT = process.env.PORT || '3000';

console.log('🚀 UniFarm Production Server Starting...');
console.log('📦 Environment: production');
console.log('⚡ TSX Runtime для TypeScript поддержки');

// Launch server with TSX for TypeScript support
const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
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