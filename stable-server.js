#!/usr/bin/env node
/**
 * Stable server entry point for production
 * Uses compiled TypeScript from server/index.ts
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import productionConfig from './production-config.js';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production environment setup
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Setup logging
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Unhandled error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
async function startServer() {
  try {
    console.log('🚀 Starting UniFarm Production Server...');
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Port: ${process.env.PORT || 3000}`);
    
    // Check if compiled server exists
    const serverPath = path.join(__dirname, 'dist', 'server', 'index.js');
    if (fs.existsSync(serverPath)) {
      console.log('Loading compiled server...');
      await import(serverPath);
    } else {
      console.log('Loading TypeScript server with tsx...');
      const { spawn } = await import('child_process');
      const tsxPath = path.join(__dirname, 'node_modules', '.bin', 'tsx');
      const serverProcess = spawn(tsxPath, ['server/index.ts'], {
        stdio: 'inherit',
        cwd: __dirname,
        env: { ...process.env, NODE_ENV: 'production' }
      });
      
      serverProcess.on('error', (error) => {
        console.error('Server process error:', error);
        process.exit(1);
      });
      
      serverProcess.on('exit', (code) => {
        if (code !== 0) {
          console.log(`Server process exited with code ${code}`);
          process.exit(code || 0);
        }
      });
      
      // Keep the process alive
      return new Promise(() => {});
    }
    
    console.log('✅ UniFarm server started successfully');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Initialize server
startServer();