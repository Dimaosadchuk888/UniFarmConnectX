#!/usr/bin/env node

/**
 * UniFarm Production-Ready Starter for Replit Workflow
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting UniFarm Complete System...\n');

// Запускаем основной скрипт
const unifarm = spawn('node', ['start-unifarm.cjs'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '3001',
    BYPASS_AUTH: 'true'
  }
});

unifarm.on('error', (err) => {
  console.error('Failed to start UniFarm:', err);
  process.exit(1);
});

unifarm.on('exit', (code) => {
  console.log(`UniFarm exited with code ${code}`);
  process.exit(code || 0);
});

// Обработка сигналов для корректного завершения
process.on('SIGTERM', () => {
  unifarm.kill('SIGTERM');
});

process.on('SIGINT', () => {
  unifarm.kill('SIGINT');
});