#!/usr/bin/env node
/**
 * Development server entry point for UniFarm
 * Uses Vite middleware for development mode
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Development environment setup
process.env.NODE_ENV = 'development';
process.env.DATABASE_PROVIDER = process.env.DATABASE_PROVIDER || 'neon';

console.log('🚀 Starting UniFarm Development Server...');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port: ${process.env.PORT || 3000}`);

// Start the development server with tsx
const tsxPath = path.join(__dirname, 'node_modules', '.bin', 'tsx');
const serverProcess = spawn(tsxPath, ['server/index.ts'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: { 
    ...process.env, 
    NODE_ENV: 'development',
    PORT: process.env.PORT || '3000'
  }
});

serverProcess.on('error', (error) => {
  console.error('❌ Server process error:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  if (code !== 0) {
    console.log(`❌ Server process exited with code ${code}`);
    process.exit(code || 0);
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down development server...');
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

console.log('✅ Development server started');