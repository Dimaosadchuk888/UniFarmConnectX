import { spawn } from 'child_process';

/**
 * Stable server entry point for UniFarm
 * Routes to the appropriate server implementation
 */
async function startStableServer() {
  console.log('🚀 Starting UniFarm Stable Server...');
  
  // Set required environment variables
  process.env.ALLOW_BROWSER_ACCESS = 'true';
  process.env.SKIP_TELEGRAM_CHECK = 'true';
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  process.env.PORT = process.env.PORT || '3000';
  
  // Start the unified server using tsx
  const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      JWT_SECRET: process.env.JWT_SECRET || 'unifarm-jwt-secret-production',
      SESSION_SECRET: process.env.SESSION_SECRET || 'unifarm-session-secret-production'
    }
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('📦 Shutting down stable server...');
    serverProcess.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    console.log('📦 Shutting down stable server...');
    serverProcess.kill('SIGINT');
  });
  
  serverProcess.on('exit', (code) => {
    console.log(`Stable server process exited with code ${code}`);
    process.exit(code);
  });
  
  serverProcess.on('error', (error) => {
    console.error('Failed to start stable server:', error);
    process.exit(1);
  });
}

startStableServer().catch(console.error);