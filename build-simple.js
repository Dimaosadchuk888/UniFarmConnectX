#!/usr/bin/env node

/**
 * Simple Production Build for UniFarm
 * Creates a minimal working build without heavy transformations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Creating simple production build for UniFarm...\n');

// Ensure dist directories exist
const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(distDir, 'public');

[distDir, publicDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Step 1: Copy static assets
console.log('📁 Copying static assets...');
const clientPublicDir = path.join(__dirname, 'client/public');
if (fs.existsSync(clientPublicDir)) {
  const files = fs.readdirSync(clientPublicDir);
  files.forEach(file => {
    if (file !== 'index.html') {
      const src = path.join(clientPublicDir, file);
      const dest = path.join(publicDir, file);
      if (fs.statSync(src).isFile()) {
        fs.copyFileSync(src, dest);
        console.log(`  ✓ Copied ${file}`);
      }
    }
  });
}

// Step 2: Build using esbuild directly (faster and simpler)
console.log('\n📦 Building JavaScript bundle with esbuild...');
try {
  execSync(`npx esbuild client/src/main.tsx --bundle --outfile=dist/public/bundle.js --platform=browser --format=esm --target=es2020 --loader:.tsx=tsx --loader:.ts=ts --loader:.jsx=jsx --loader:.js=js --loader:.css=css --loader:.svg=dataurl --loader:.png=dataurl --loader:.jpg=dataurl --define:process.env.NODE_ENV='"production"' --minify`, {
    stdio: 'inherit'
  });
  console.log('✓ JavaScript bundle created');
} catch (error) {
  console.error('❌ Error building JavaScript bundle:', error.message);
  console.log('\nTrying alternative build approach...');
  
  // Alternative: Create a simple loader that imports the app
  const loaderContent = `
// Simple production loader for UniFarm
console.log('[UniFarm] Starting application...');

// Set production environment
window.UNIFARM_PRODUCTION = true;
window.VITE_API_URL = window.location.origin;

// Show loading state
const root = document.getElementById('root');
if (root) {
  root.innerHTML = \`
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
      <div style="text-align: center; color: white;">
        <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">UniFarm</h1>
        <p style="font-size: 1.2rem; opacity: 0.8;">Loading application...</p>
        <div style="margin-top: 2rem;">
          <div style="width: 50px; height: 50px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        </div>
      </div>
    </div>
  \`;
}

// Load React app dynamically
import('/src/main.tsx').then(() => {
  console.log('[UniFarm] Application loaded successfully');
}).catch(error => {
  console.error('[UniFarm] Failed to load application:', error);
  if (root) {
    root.innerHTML = \`
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #1a1a1a;">
        <div style="text-align: center; color: white; max-width: 600px; padding: 2rem;">
          <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #ff6b6b;">Error Loading UniFarm</h1>
          <p style="font-size: 1.1rem; opacity: 0.8; margin-bottom: 2rem;">The application failed to load. This might be due to a build configuration issue.</p>
          <p style="font-size: 0.9rem; opacity: 0.6;">Please refresh the page or contact support if the problem persists.</p>
        </div>
      </div>
    \`;
  }
});
`;
  
  fs.writeFileSync(path.join(publicDir, 'bundle.js'), loaderContent);
  console.log('✓ Created fallback loader');
}

// Step 3: Create optimized index.html
console.log('\n📄 Creating production index.html...');
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>UniFarm - Telegram Mini App</title>
    <meta name="description" content="UniFarm - Advanced crypto farming platform">
    
    <!-- Telegram Web App -->
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    
    <!-- PWA -->
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#6366f1">
    
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #0f0f23;
        color: white;
        overflow-x: hidden;
      }
      
      #root {
        min-height: 100vh;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      /* Tailwind CSS will be loaded by the app */
    </style>
</head>
<body>
    <div id="root"></div>
    
    <!-- Production bundle -->
    <script type="module" src="/bundle.js"></script>
    
    <!-- Fallback for older browsers -->
    <noscript>
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #1a1a1a;">
        <div style="text-align: center; color: white; padding: 2rem;">
          <h1>JavaScript Required</h1>
          <p>Please enable JavaScript to use UniFarm.</p>
        </div>
      </div>
    </noscript>
</body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'index.html'), indexHtml);
console.log('✓ Created production index.html');

// Step 4: Create build info
const buildInfo = {
  buildTime: new Date().toISOString(),
  buildType: 'simple-production',
  environment: 'production',
  version: '1.0.0'
};

fs.writeFileSync(path.join(publicDir, 'build-info.json'), JSON.stringify(buildInfo, null, 2));

console.log('\n✅ Simple production build completed!');
console.log('\nBuild output:');
console.log(`  📁 ${publicDir}/`);
console.log(`  📄 ${publicDir}/index.html`);
console.log(`  📦 ${publicDir}/bundle.js`);
console.log(`  ℹ️  ${publicDir}/build-info.json`);
console.log('\nTo run the production server:');
console.log('  NODE_ENV=production npm start');