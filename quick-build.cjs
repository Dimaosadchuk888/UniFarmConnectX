const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Quick UniFarm Build Script');

// Ensure we're in the right directory
process.chdir('/home/runner/workspace');

// Clean old dist
if (fs.existsSync('dist')) {
  console.log('🧹 Cleaning old dist...');
  execSync('rm -rf dist', { stdio: 'inherit' });
}

// Build with correct vite config path
console.log('🔨 Building frontend...');
try {
  execSync('npx vite build --config vite.config.ts', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Verify build output
if (fs.existsSync('dist/public/index.html')) {
  console.log('✅ Build output verified');
  const assets = fs.readdirSync('dist/public/assets');
  console.log(`📦 Built ${assets.length} asset files`);
} else {
  console.error('❌ Build output not found');
  process.exit(1);
}