#!/usr/bin/env node

/**
 * Direct server startup script for testing
 */

const { spawn } = require('child_process');

console.log('🚀 Starting UniFarm server...');

const server = spawn('tsx', ['server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: '3000'
  }
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
});