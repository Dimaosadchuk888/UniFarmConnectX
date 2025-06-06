#!/usr/bin/env node
/**
 * Stable server entry point - now uses preview server for better compatibility
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use development mode for preview
process.env.NODE_ENV = 'development';

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
    console.log('🚀 Starting UniFarm Preview Server...');
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Port: ${process.env.PORT || 3000}`);
    
    // Use simple preview for TypeScript compilation
    console.log('Loading application with Vite...');
    await import('./simple-preview.js');
    
    console.log('✅ UniFarm preview server started successfully');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Initialize server
startServer();