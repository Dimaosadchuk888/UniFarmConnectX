/**
 * Simple database connection test for Neon DB
 */

import pg from 'pg';
const { Pool } = pg;

// Set SSL mode for connection
process.env.PGSSLMODE = 'require';

async function testNeonConnection() {
  console.log('🔄 Testing connection to Neon DB...');
  
  try {
    // Try with DATABASE_URL environment variable
    if (process.env.DATABASE_URL) {
      console.log('✓ Found DATABASE_URL environment variable');
      
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      });
      
      // Test the connection with a simple query
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT NOW() as current_time');
        console.log(`✅ Successfully connected to Neon DB: ${result.rows[0].current_time}`);
        return true;
      } finally {
        client.release();
        await pool.end();
      }
    } else {
      console.log('⚠️ DATABASE_URL environment variable not found');
      
      // Try with individual credentials
      if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
        console.log('✓ Found individual PostgreSQL connection parameters');
        
        const pool = new Pool({
          host: process.env.PGHOST,
          port: process.env.PGPORT || 5432,
          user: process.env.PGUSER,
          password: process.env.PGPASSWORD,
          database: process.env.PGDATABASE,
          ssl: {
            rejectUnauthorized: false
          }
        });
        
        // Test the connection
        const client = await pool.connect();
        try {
          const result = await client.query('SELECT NOW() as current_time');
          console.log(`✅ Successfully connected using individual parameters: ${result.rows[0].current_time}`);
          return true;
        } finally {
          client.release();
          await pool.end();
        }
      } else {
        console.error('❌ No database connection parameters found');
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Output the environment variables for connection (without revealing sensitive data)
function logConnectionInfo() {
  console.log('\n--- Database Connection Info ---');
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✓ Set' : '✗ Not set'}`);
  console.log(`PGHOST: ${process.env.PGHOST ? '✓ Set' : '✗ Not set'}`);
  console.log(`PGPORT: ${process.env.PGPORT || '5432 (default)'}`);
  console.log(`PGUSER: ${process.env.PGUSER ? '✓ Set' : '✗ Not set'}`);
  console.log(`PGPASSWORD: ${process.env.PGPASSWORD ? '✓ Set' : '✗ Not set'}`);
  console.log(`PGDATABASE: ${process.env.PGDATABASE ? '✓ Set' : '✗ Not set'}`);
  console.log(`PGSSLMODE: ${process.env.PGSSLMODE || 'not set'}`);
  console.log('-----------------------------\n');
}

// Main function
async function main() {
  logConnectionInfo();
  
  const connected = await testNeonConnection();
  
  if (connected) {
    console.log('\n✅ Database connection test successful');
  } else {
    console.error('\n❌ Database connection test failed');
    process.exit(1);
  }
}

// Run the test
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});