#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

// Kill any existing processes
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

// Start Vite dev server directly
const viteProcess = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '3000'], {
  cwd: path.resolve(__dirname, 'client'),
  stdio: 'inherit'
});

viteProcess.on('error', (err) => {
  console.error('Failed to start Vite:', err);
  process.exit(1);
});

viteProcess.on('close', (code) => {
  console.log(`Vite process exited with code ${code}`);
  process.exit(code);
});

console.log('🚀 Starting Vite development server...');