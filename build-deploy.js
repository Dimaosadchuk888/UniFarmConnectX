#!/usr/bin/env node

/**
 * Optimized Build Script for UniFarm Production Deployment
 * Handles efficient Vite build with optimizations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting UniFarm production build...');

// Set production environment
process.env.NODE_ENV = 'production';

// Ensure the client directory structure is correct
const clientDir = path.join(__dirname, 'client');
const distDir = path.join(__dirname, 'dist');

console.log('📁 Preparing build environment...');

// Clean existing dist directory
if (fs.existsSync(distDir)) {
  console.log('🧹 Cleaning existing build artifacts...');
  fs.rmSync(distDir, { recursive: true, force: true });
}

// Create dist directory
fs.mkdirSync(distDir, { recursive: true });

try {
  console.log('⚡ Building frontend with optimizations...');
  
  // Build from client directory with optimizations
  execSync(`cd ${clientDir} && npm run build:prod`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=4096'
    }
  });

  console.log('✅ Build completed successfully!');
  
  // Check if build artifacts exist
  const publicDir = path.join(distDir, 'public');
  if (fs.existsSync(publicDir)) {
    const files = fs.readdirSync(publicDir);
    console.log(`📦 Generated ${files.length} build artifacts in dist/public/`);
    console.log('Files:', files.map(f => `  - ${f}`).join('\n'));
  } else {
    console.warn('⚠️  dist/public directory not found after build');
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

console.log('🎉 UniFarm is ready for deployment!');