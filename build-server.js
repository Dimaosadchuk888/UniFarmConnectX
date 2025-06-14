#!/usr/bin/env node

/**
 * Build Script for UniFarm Server TypeScript Compilation
 * Compiles TypeScript server code to JavaScript for production deployment
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔨 Building UniFarm server for production deployment...');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Compile TypeScript server code
const buildServer = () => {
  return new Promise((resolve, reject) => {
    console.log('📦 Compiling TypeScript server code...');
    
    const tsc = spawn('npx', ['tsc', '--project', 'tsconfig.server.json'], {
      stdio: 'inherit',
      shell: true
    });

    tsc.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Server compilation completed successfully');
        resolve();
      } else {
        console.error('❌ Server compilation failed');
        reject(new Error(`TypeScript compilation failed with code ${code}`));
      }
    });

    tsc.on('error', (error) => {
      console.error('❌ TypeScript compilation error:', error);
      reject(error);
    });
  });
};

// Build frontend
const buildFrontend = () => {
  return new Promise((resolve, reject) => {
    console.log('🎨 Building frontend...');
    
    const vite = spawn('npx', ['vite', 'build', '--config', 'client/vite.config.ts'], {
      stdio: 'inherit',
      shell: true
    });

    vite.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Frontend build completed successfully');
        resolve();
      } else {
        console.error('❌ Frontend build failed');
        reject(new Error(`Frontend build failed with code ${code}`));
      }
    });

    vite.on('error', (error) => {
      console.error('❌ Frontend build error:', error);
      reject(error);
    });
  });
};

// Main build process
async function main() {
  try {
    // Build frontend first
    await buildFrontend();
    
    // Then build server
    await buildServer();
    
    console.log('🎉 Complete build finished successfully!');
    console.log('📁 Built files:');
    console.log('   - Frontend: dist/public/');
    console.log('   - Server: dist/server/');
    console.log('🚀 Ready for deployment with: node dist/server/index.js');
    
  } catch (error) {
    console.error('💥 Build process failed:', error.message);
    process.exit(1);
  }
}

main();