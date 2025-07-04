#!/usr/bin/env node
/**
 * Build script for UniFarm deployment
 * Handles Vite build process with correct configuration
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting UniFarm build process...');

// Change to client directory where the actual source files are
process.chdir(path.join(__dirname, 'client'));

// Run Vite build with the correct configuration
const buildProcess = spawn('npx', ['vite', 'build'], {
  stdio: 'inherit',
  shell: true
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Build completed successfully!');
    console.log('📦 Built files are available in dist/public');
  } else {
    console.error(`❌ Build failed with code ${code}`);
    process.exit(code);
  }
});

buildProcess.on('error', (error) => {
  console.error('❌ Build process error:', error);
  process.exit(1);
});