#!/usr/bin/env node

/**
 * Simple ESM launcher for UniFarm server
 * Works around TypeScript compilation issues
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('[UniFarm] Starting server with tsx...');

const serverPath = resolve(__dirname, 'server/index.ts');
const child = spawn('tsx', [serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || '3000'
  }
});

child.on('error', (error) => {
  console.error('[UniFarm] Server failed to start:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`[UniFarm] Server exited with code ${code}`);
  process.exit(code || 0);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('[UniFarm] Shutting down server...');
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('[UniFarm] Terminating server...');
  child.kill('SIGTERM');
});