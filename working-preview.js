#!/usr/bin/env node
/**
 * Working preview server for UniFarm
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure clean startup
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

const port = process.env.PORT || 3000;

// Start Vite with explicit port binding
const viteProcess = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', port, '--force'], {
  cwd: path.join(__dirname, 'client'),
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: '1' }
});

viteProcess.on('error', (err) => {
  console.error('Vite startup failed:', err.message);
  process.exit(1);
});

viteProcess.on('close', (code) => {
  if (code !== 0) {
    console.log(`Preview server stopped with code ${code}`);
  }
  process.exit(code);
});

console.log(`Starting UniFarm preview on port ${port}...`);