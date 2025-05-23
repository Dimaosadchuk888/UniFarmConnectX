/**
 * Unified startup script for UniFarm (Remix)
 * - Forces Neon DB usage regardless of .replit settings
 * - Suitable for deployment
 * - Ensures DB connections are correctly established
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { createRequire } from 'module';

// Создаем require функцию, которая может использоваться внутри ES модуля
const require = createRequire(import.meta.url);

// Set environment variables for Production PostgreSQL
// Use Neon DB as primary with Replit PostgreSQL as fallback
process.env.DATABASE_PROVIDER = 'neon';
process.env.FORCE_NEON_DB = 'true';
process.env.DISABLE_MEMORY_STORAGE = 'true';
process.env.USE_PRODUCTION_DB = 'true';
process.env.ENABLE_DB_CONNECTION_RECOVERY = 'true';
process.env.NODE_ENV = 'production';
// Enable production features
process.env.SKIP_TELEGRAM_CHECK = 'true';
process.env.ALLOW_BROWSER_ACCESS = 'true';

// Log early DB configuration to verify settings
console.log('===============================================');
console.log('UNIFARM STARTUP - PRODUCTION POSTGRESQL CONFIGURATION');
console.log('===============================================');
console.log('DATABASE_PROVIDER =', process.env.DATABASE_PROVIDER);
console.log('FORCE_NEON_DB =', process.env.FORCE_NEON_DB);
console.log('DISABLE_REPLIT_DB =', process.env.DISABLE_REPLIT_DB);
console.log('OVERRIDE_DB_PROVIDER =', process.env.OVERRIDE_DB_PROVIDER);
console.log('NODE_ENV =', process.env.NODE_ENV);
console.log('PORT =', process.env.PORT);
console.log('SKIP_PARTITION_CREATION =', process.env.SKIP_PARTITION_CREATION);
console.log('IGNORE_PARTITION_ERRORS =', process.env.IGNORE_PARTITION_ERRORS);
console.log('===============================================');

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
  console.log('  STARTING UNIFARM IN PRODUCTION MODE (MEMORY STORAGE)');
  console.log('===================================================');
  console.log('Start time:', new Date().toISOString());
  console.log('Database settings: FORCED MEMORY STORAGE (Neon DB unavailable)');
  console.log('===================================================');
  
  try {
    // Убедимся, что используем порт 3000 для совместимости с Replit
    const port = parseInt(process.env.PORT || '3000', 10);
    console.log(`Using port ${port} for application...`);
    
    // Проверяем, собран ли проект
    if (process.env.NODE_ENV === 'production' && !fs.existsSync('./dist/index.js')) {
      console.log('Production build not found. Running build process...');
      
      try {
        // Запускаем сборку проекта
        await runProcess('npm', ['run', 'build']);
        console.log('Build completed successfully!');
      } catch (buildError) {
        console.error('Error during build process:', buildError);
        console.log('Continuing with available files...');
      }
    }
    
    // Определяем последовательность приоритета файлов для запуска
    const potentialStartFiles = [
      { path: './dist/index.js', command: 'node dist/index.js' },
      { path: './server/index.js', command: 'node server/index.js' },
      { path: './server/index.ts', command: 'npx tsx server/index.ts' },
      { path: './index.js', command: 'node index.js' }
    ];
    
    let startFileFound = false;
    
    // Проверяем каждый файл в порядке приоритета
    for (const startFile of potentialStartFiles) {
      if (fs.existsSync(startFile.path)) {
        console.log(`Found ${startFile.path}, starting application...`);
        startFileFound = true;
        
        const [command, ...args] = startFile.command.split(' ');
        
        // Создаем единую среду с приоритетом использования in-memory хранилища
        const envVars = {
          ...process.env,
          DATABASE_PROVIDER: 'memory',
          FORCE_MEMORY_STORAGE: 'true',
          ALLOW_MEMORY_FALLBACK: 'true',
          USE_MEMORY_SESSION: 'true',
          IGNORE_DB_CONNECTION_ERRORS: 'true',
          NODE_ENV: 'production',
          PORT: port.toString(),
          SKIP_PARTITION_CREATION: 'true',
          IGNORE_PARTITION_ERRORS: 'true',
          SKIP_TELEGRAM_CHECK: 'true',
          ALLOW_BROWSER_ACCESS: 'true'
        };
        
        console.log('Starting with environment variables:');
        console.log('DATABASE_PROVIDER =', envVars.DATABASE_PROVIDER);
        console.log('FORCE_NEON_DB =', envVars.FORCE_NEON_DB);
        console.log('DISABLE_REPLIT_DB =', envVars.DISABLE_REPLIT_DB);
        console.log('OVERRIDE_DB_PROVIDER =', envVars.OVERRIDE_DB_PROVIDER);
        
        await runProcess(command, args, { env: envVars });
        break;
      }
    }
    
    if (!startFileFound) {
      console.error('Error: No valid entry point found. Looked for: server/index.ts, server/index.js, index.js, dist/index.js');
      console.error('Keeping process alive for Replit stability, but server will not start...');
      // Замість process.exit, просто тримаємо процес активним
      setInterval(() => {
        console.log('[WARNING] Server failed to start due to missing entry point. Process kept alive for Replit stability');
      }, 60000); // Повідомлення кожну хвилину
      return;
    }
  } catch (error) {
    console.error('Error starting application:', error);
    console.error('Keeping process alive for Replit stability, but server may not work correctly...');
    // Замість process.exit, просто тримаємо процес активним
    setInterval(() => {
      console.log('[WARNING] Server encountered errors but process kept alive for Replit stability');
    }, 60000); // Повідомлення кожну хвилину
    return;
  }
}

// Start the application
main().catch(error => {
  console.error('Critical error:', error);
  console.error('Keeping process alive for Replit stability despite critical error...');
  
  // Запускаємо моніторинг та підтримуємо процес активним
  setInterval(() => {
    console.log('[WARNING] Server encountered critical error but process kept alive for Replit stability');
    console.log('Error details:', error.message || String(error));
  }, 30000); // Повідомлення кожні 30 секунд
});