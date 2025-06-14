#!/usr/bin/env node

/**
 * UniFarm Stable Production Server
 * Uses tsx runtime for reliable TypeScript execution in production
 */

import { spawn } from 'child_process';

// Set production environment
process.env.NODE_ENV = 'production';
process.env.HOST = '0.0.0.0';
process.env.PORT = process.env.PORT || '3000';

console.log('Starting UniFarm production server...');
console.log(`Port: ${process.env.PORT}`);
console.log(`Host: ${process.env.HOST}`);
console.log('Using tsx runtime for TypeScript execution');

// Start server directly with tsx for reliable deployment
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: process.env
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});