#!/usr/bin/env node

/**
 * Development Server with Vite Integration
 * Runs backend server with Vite dev server for frontend
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting UniFarm Development Server...');

// Start both Vite and backend server concurrently
const viteProcess = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '3000'], {
  stdio: 'inherit',
  shell: true
});

// Give Vite time to start, then start backend on different port
setTimeout(() => {
  console.log('🔧 Starting backend server on port 3001...');
  const backendProcess = spawn('npx', ['tsx', 'server/index.ts'], {
    env: {
      ...process.env,
      PORT: '3001',
      NODE_ENV: 'development'
    },
    stdio: 'inherit',
    shell: true
  });
  
  backendProcess.on('error', (error) => {
    console.error('Backend error:', error);
  });
}, 2000);

viteProcess.on('error', (error) => {
  console.error('Vite error:', error);
});

// Handle shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  viteProcess.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  viteProcess.kill();
  process.exit(0);
});