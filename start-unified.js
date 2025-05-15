/**
 * Unified startup script for UniFarm (Remix)
 * - Forces Neon DB usage
 * - Suitable for deployment
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

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
    // Check if index.js exists in current directory
    if (fs.existsSync('./dist/index.js')) {
      console.log('Found dist/index.js, starting application...');
      
      const startCommand = 'node dist/index.js';
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
    } else {
      console.log('Starting index.js directly...');
      // Start the server directly (for development mode)
      const startCommand = 'node index.js';
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
    }
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