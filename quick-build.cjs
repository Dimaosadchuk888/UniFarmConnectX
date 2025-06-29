/**
 * Quick Build Script for UniFarm
 * Minimal production build without heavy transformations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting quick production build...');

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist/public');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy static files
console.log('📁 Copying static files...');
const publicDir = path.join(__dirname, 'client/public');
if (fs.existsSync(publicDir)) {
  const files = fs.readdirSync(publicDir);
  files.forEach(file => {
    const sourcePath = path.join(publicDir, file);
    const destPath = path.join(distDir, file);
    
    // Skip directories and index.html
    if (file !== 'index.html' && fs.statSync(sourcePath).isFile()) {
      fs.copyFileSync(sourcePath, destPath);
    }
  });
}

// Create production index.html
console.log('📄 Creating production index.html...');
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>UniFarm - Telegram Mini App</title>
    <meta name="description" content="UniFarm - Advanced crypto farming platform">
    
    <!-- Telegram Web App -->
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    
    <!-- Cache control -->
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    
    <!-- PWA -->
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#6366f1">
    
    <style>
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #0f0f23;
        color: white;
      }
      #root {
        min-height: 100vh;
      }
      .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      .spinner {
        width: 50px;
        height: 50px;
        border: 3px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
</head>
<body>
    <div id="root">
      <div class="loading">
        <div class="spinner"></div>
      </div>
    </div>
    <script>
      // Quick production mode indicator
      window.UNIFARM_PRODUCTION = true;
      window.VITE_API_URL = window.location.origin;
    </script>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;

fs.writeFileSync(path.join(distDir, 'index.html'), indexHtml);

// Create a simple production notice
console.log('📝 Creating production notice...');
const notice = `
UniFarm Production Build
========================
Build Time: ${new Date().toISOString()}
Mode: Quick Build (Development Server)

Note: This is a quick build that runs the development server in production mode.
For a full optimized build, run 'npm run build' when you have more resources.
`;

fs.writeFileSync(path.join(distDir, 'BUILD_INFO.txt'), notice);

console.log('✅ Quick build completed!');
console.log('');
console.log('To run in production mode:');
console.log('  NODE_ENV=production npm run dev');
console.log('');
console.log('The app will be available at http://localhost:3000');