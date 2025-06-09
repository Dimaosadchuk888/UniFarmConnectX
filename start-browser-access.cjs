const { spawn } = require('child_process');
const path = require('path');

/**
 * Browser access entry point for UniFarm
 * Starts the unified server with browser access enabled
 */
async function startBrowserAccess() {
  console.log('🚀 Starting UniFarm with browser access...');
  
  // Set environment variables for browser access
  process.env.ALLOW_BROWSER_ACCESS = 'true';
  process.env.SKIP_TELEGRAM_CHECK = 'true';
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  process.env.PORT = process.env.PORT || '3000';
  
  // Start the unified server
  const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      JWT_SECRET: process.env.JWT_SECRET || 'unifarm-jwt-secret-production',
      SESSION_SECRET: process.env.SESSION_SECRET || 'unifarm-session-secret-production'
    }
  });
  
  // Handle process termination
  process.on('SIGTERM', () => {
    console.log('📦 Shutting down UniFarm...');
    serverProcess.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    console.log('📦 Shutting down UniFarm...');
    serverProcess.kill('SIGINT');
  });
  
  serverProcess.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
  });
}

startBrowserAccess().catch(console.error);