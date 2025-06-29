#!/usr/bin/env node

/**
 * Production Build Script for UniFarm
 * Builds only the frontend - server runs with tsx runtime
 */

import { spawn } from 'child_process';
import fs from 'fs';

console.log('🔨 Building UniFarm for production deployment...');

// Build frontend only
const buildFrontend = () => {
  return new Promise((resolve, reject) => {
    console.log('🎨 Building frontend...');
    
    const vite = spawn('npx', ['vite', 'build'], {
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
    await buildFrontend();
    
    console.log('🎉 Production build completed successfully!');
    console.log('📁 Built files: dist/public/');
    console.log('🚀 Server will run with tsx runtime');
    console.log('🎯 Ready for deployment with: node server.js');
    
  } catch (error) {
    console.error('💥 Build process failed:', error.message);
    process.exit(1);
  }
}

main();