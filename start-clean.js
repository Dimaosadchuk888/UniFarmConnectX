#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Clear all possible caches
console.log('Clearing all caches...');

// Clear tsx cache
process.env.TSX_DISABLE_CACHE = 'true';

// Set environment variables
process.env.NODE_ENV = 'production';
process.env.PORT = '4001';

// Start the server
console.log('Starting server with fresh compilation...');
const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: process.env
});

serverProcess.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});