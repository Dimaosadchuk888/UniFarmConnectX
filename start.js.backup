#!/usr/bin/env node
/**
 * Main entry point for UniFarm application
 * Ensures proper workflow detection by Replit
 */

import { spawn } from 'child_process';

console.log('🚀 Starting UniFarm Application...');

// Set environment for preview
process.env.NODE_ENV = 'development';
process.env.PORT = process.env.PORT || '3000';

// Start the backend server with tsx for TypeScript support
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  server.kill('SIGTERM');
});