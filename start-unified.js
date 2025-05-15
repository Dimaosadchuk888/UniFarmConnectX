/**
 * Unified startup script for UniFarm (Remix)
 * - Forces Neon DB usage
 * - Verifies and maintains partitioning
 */

import { spawn } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

// Set environment variables to force Neon DB usage
process.env.DATABASE_PROVIDER = 'neon';
process.env.FORCE_NEON_DB = 'true';
process.env.DISABLE_REPLIT_DB = 'true';
process.env.OVERRIDE_DB_PROVIDER = 'neon';
process.env.NODE_ENV = 'production';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run a command as a child process
 */
async function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const childProcess = spawn(command, args, {
      stdio: 'inherit',
      ...options
    });

    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code: ${code}`));
      }
    });
    
    childProcess.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Main application startup function
 */
async function main() {
  console.log('===================================================');
  console.log('  STARTING UNIFARM IN PRODUCTION MODE (NEON DB)');
  console.log('===================================================');
  console.log('Start time:', new Date().toISOString());
  console.log('Database settings: FORCED NEON DB');
  console.log('===================================================');
  
  try {
    // In production, we need to run the built application
    const startCommand = 'node server/index.js';
    console.log(`Starting application with command: ${startCommand}`);
    console.log('===================================================');
    
    const [command, ...args] = startCommand.split(' ');
    await runProcess(command, args, {
      env: {
        ...process.env,
        DATABASE_PROVIDER: 'neon',
        FORCE_NEON_DB: 'true',
        DISABLE_REPLIT_DB: 'true',
        OVERRIDE_DB_PROVIDER: 'neon',
        NODE_ENV: 'production'
      }
    });
  } catch (error) {
    console.error('Error starting application:', error);
    process.exit(1);
  }
}

// Start the application
main().catch(error => {
  console.error('Critical error:', error);
  process.exit(1);
});