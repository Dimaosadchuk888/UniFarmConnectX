/**
 * Unified startup script for UniFarm (Remix)
 * - Forces Neon DB usage
 * - Verifies and maintains partitioning
 */

const dotenv = require('dotenv');
const { Pool } = require('pg');
const { spawn } = require('child_process');
const { format, addDays } = require('date-fns');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Set environment variables to force Neon DB usage
process.env.DATABASE_PROVIDER = 'neon';
process.env.FORCE_NEON_DB = 'true';
process.env.DISABLE_REPLIT_DB = 'true';
process.env.OVERRIDE_DB_PROVIDER = 'neon';

console.log('🚀 UniFarm (Remix) Unified Startup');
console.log('Running with forced Neon DB configuration');

// Create the database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Execute SQL query with parameters
 */
async function executeQuery(query, params = []) {
  try {
    const result = await pool.query(query, params);
    return result;
  } catch (error) {
    console.error(`SQL Error: ${error.message}`);
    return { rows: [] };
  }
}

/**
 * Check if a table exists
 */
async function tableExists(tableName) {
  const result = await executeQuery(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )
  `, [tableName]);
  
  return result.rows[0]?.exists || false;
}

/**
 * Check if transactions table is partitioned
 */
async function isTablePartitioned() {
  try {
    const result = await executeQuery(`
      SELECT count(*) as partition_count
      FROM pg_inherits i
      JOIN pg_class p ON p.oid = i.inhparent
      JOIN pg_class c ON c.oid = i.inhrelid
      WHERE p.relname = 'transactions'
    `);
    
    return parseInt(result.rows[0]?.partition_count || 0) > 0;
  } catch (error) {
    console.error('Error checking if table is partitioned:', error.message);
    return false;
  }
}

/**
 * Create a partition for the specified date
 */
async function createPartitionForDate(date) {
  try {
    const dateStr = format(date, 'yyyy_MM_dd');
    const partitionName = `transactions_${dateStr}`;
    
    const startDate = format(date, 'yyyy-MM-dd');
    const endDate = format(addDays(date, 1), 'yyyy-MM-dd');
    
    // Check if partition already exists
    const partitionExists = await tableExists(partitionName);
    if (partitionExists) {
      console.log(`Partition ${partitionName} already exists.`);
      return true;
    }
    
    console.log(`Creating partition ${partitionName} for ${startDate}`);
    
    // Create the partition
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ${partitionName}
      PARTITION OF transactions
      FOR VALUES FROM ('${startDate}') TO ('${endDate}')
    `);
    
    // Create indices
    try {
      await executeQuery(`CREATE INDEX IF NOT EXISTS ${partitionName}_user_id_idx ON ${partitionName} (user_id)`);
      await executeQuery(`CREATE INDEX IF NOT EXISTS ${partitionName}_type_idx ON ${partitionName} (type)`);
      await executeQuery(`CREATE INDEX IF NOT EXISTS ${partitionName}_created_at_idx ON ${partitionName} (created_at)`);
    } catch (error) {
      console.warn(`Warning creating indices for ${partitionName}: ${error.message}`);
    }
    
    console.log(`Partition ${partitionName} created successfully`);
    return true;
  } catch (error) {
    console.error(`Error creating partition for ${format(date, 'yyyy-MM-dd')}:`, error.message);
    return false;
  }
}

/**
 * Create partitions for upcoming days
 */
async function createFuturePartitions(daysAhead = 7) {
  const today = new Date();
  const results = [];
  
  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(today, i);
    const success = await createPartitionForDate(date);
    results.push({
      date: format(date, 'yyyy-MM-dd'),
      success
    });
  }
  
  return results;
}

/**
 * Run a child process and return result as a promise
 */
function runProcess(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command} ${args.join(' ')}`);
    
    const proc = spawn(command, args, {
      stdio: 'inherit',
      ...options
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Main function
 */
async function main() {
  try {
    // Test database connection
    console.log('Testing database connection...');
    const connectionTest = await executeQuery('SELECT NOW() as time');
    
    if (connectionTest.rows.length > 0) {
      console.log(`✅ Connected to database at ${connectionTest.rows[0].time}`);
    } else {
      console.error('❌ Failed to connect to database');
      process.exit(1);
    }
    
    // Check if transactions table exists
    const transactionsExists = await tableExists('transactions');
    console.log(`Transactions table exists: ${transactionsExists}`);
    
    if (transactionsExists) {
      // Check if transactions table is partitioned
      const isPartitioned = await isTablePartitioned();
      console.log(`Transactions table is partitioned: ${isPartitioned}`);
      
      if (isPartitioned) {
        console.log('Creating/checking future partitions...');
        const partitionResults = await createFuturePartitions(7);
        
        const successCount = partitionResults.filter(r => r.success).length;
        console.log(`Created/verified ${successCount} partitions successfully`);
      }
    }
    
    // Close database connection
    await pool.end();
    
    // Determine start command based on package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    let startCommand = 'node server/index.js';
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (packageJson.scripts && packageJson.scripts.start) {
          startCommand = 'npm run start';
        } else if (packageJson.scripts && packageJson.scripts.dev) {
          startCommand = 'npm run dev';
        }
      } catch (error) {
        console.error('Error reading package.json:', error.message);
      }
    }
    
    // Start the application
    console.log(`Starting application with command: ${startCommand}`);
    console.log('===================================================');
    
    const [command, ...args] = startCommand.split(' ');
    await runProcess(command, args, {
      env: {
        ...process.env,
        DATABASE_PROVIDER: 'neon',
        FORCE_NEON_DB: 'true',
        DISABLE_REPLIT_DB: 'true',
        OVERRIDE_DB_PROVIDER: 'neon'
      }
    });
  } catch (error) {
    console.error('Error during startup:', error.message);
    process.exit(1);
  }
}

// Execute the main function
main();