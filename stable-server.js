#!/usr/bin/env node

/**
 * UniFarm Stable Production Server
 * Handles TypeScript compilation and starts the production server
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Set production environment
process.env.NODE_ENV = 'production';
process.env.HOST = '0.0.0.0';
process.env.PORT = process.env.PORT || '3000';
process.env.DATABASE_PROVIDER = 'neon';
process.env.FORCE_NEON_DB = 'true';
process.env.DISABLE_REPLIT_DB = 'true';

console.log('Starting UniFarm production server...');
console.log(`Port: ${process.env.PORT}`);
console.log(`Host: ${process.env.HOST}`);

// Check if compiled server exists
const compiledServerPath = path.join(process.cwd(), 'dist', 'server', 'index.js');
const hasCompiledServer = fs.existsSync(compiledServerPath);

async function startServer() {
  try {
    if (hasCompiledServer) {
      console.log('✅ Found compiled server, starting production server...');
      // Import and start the compiled server
      await import('./dist/server/index.js');
    } else {
      console.log('⚠️ No compiled server found, compiling TypeScript first...');
      
      // Build the server first
      await new Promise((resolve, reject) => {
        const build = spawn('node', ['build-server.js'], {
          stdio: 'inherit',
          env: process.env
        });

        build.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Build failed with code ${code}`));
          }
        });

        build.on('error', reject);
      });

      console.log('✅ Build completed, starting server...');
      
      // Now start the compiled server
      await import('./dist/server/index.js');
    }
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    
    // Fallback: try to run with tsx if available
    console.log('🔄 Attempting fallback with tsx...');
    try {
      const tsx = spawn('npx', ['tsx', 'server/index.ts'], {
        stdio: 'inherit',
        env: process.env
      });

      tsx.on('error', (tsxError) => {
        console.error('❌ Fallback also failed:', tsxError);
        process.exit(1);
      });
    } catch (fallbackError) {
      console.error('❌ All startup methods failed:', fallbackError);
      process.exit(1);
    }
  }
}

startServer();