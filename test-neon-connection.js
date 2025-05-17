/**
 * Test script to verify Neon DB connection with environment variable
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';
import fs from 'fs';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Log message with color
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testConnection() {
  log('\n=== TESTING NEON DB CONNECTION WITH ENVIRONMENT VARIABLE ===', colors.blue);
  
  // Load environment variables
  if (fs.existsSync('.env.neon')) {
    log('Loading variables from .env.neon...', colors.cyan);
    const envContent = fs.readFileSync('.env.neon', 'utf-8');
    const envLines = envContent.split('\n');
    
    envLines.forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length) {
          let value = valueParts.join('=').trim();
          
          // Process environment variables in the format ${VAR_NAME}
          if (value.includes('${') && value.includes('}')) {
            // Replace ${VAR_NAME} with the environment variable value
            value = value.replace(/\${([^}]+)}/g, (match, varName) => {
              const replacement = process.env[varName];
              if (!replacement) {
                log(`Warning: Environment variable ${varName} not found`, colors.yellow);
                return '';
              }
              return replacement;
            });
          }
          
          process.env[key.trim()] = value;
        }
      }
    });
  } else {
    log('Warning: .env.neon file not found', colors.yellow);
  }
  
  // Check for DATABASE_URL
  if (!process.env.DATABASE_URL) {
    log('Error: DATABASE_URL is not set!', colors.red);
    log('Make sure NEON_DB_URL is set in your environment', colors.yellow);
    return false;
  }
  
  // Mask the connection string for security
  const maskedUrl = process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@');
  log(`DATABASE_URL: ${maskedUrl}`, colors.blue);
  
  // Try to connect to the database
  log('\nAttempting to connect to the database...', colors.cyan);
  
  try {
    // Create a pool with the connection string
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    // Test the connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now');
    const now = result.rows[0].now;
    client.release();
    
    log(`✅ Successfully connected to the database!`, colors.green);
    log(`Server time: ${now}`, colors.green);
    
    // Clean up
    await pool.end();
    return true;
  } catch (error) {
    log(`❌ Failed to connect to the database:`, colors.red);
    log(`${error.message}`, colors.red);
    return false;
  }
}

// Run the test
testConnection()
  .then(success => {
    if (success) {
      log('\n✅ Connection test successful', colors.green);
      process.exit(0);
    } else {
      log('\n❌ Connection test failed', colors.red);
      process.exit(1);
    }
  })
  .catch(error => {
    log(`\n❌ Error running test: ${error.message}`, colors.red);
    process.exit(1);
  });