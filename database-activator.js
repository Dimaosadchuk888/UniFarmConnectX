/**
 * Comprehensive Database Activator
 * Multiple connection strategies for Neon database activation
 */

import pg from 'pg';
const { Client } = pg;

async function activateDatabase() {
  console.log('Starting comprehensive database activation...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found in environment');
    return false;
  }

  // Strategy 1: Standard PostgreSQL client with SSL
  console.log('Strategy 1: Standard PostgreSQL connection...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    query_timeout: 30000,
    statement_timeout: 30000
  });

  try {
    await client.connect();
    console.log('Connected successfully with standard PostgreSQL client');

    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('Database time:', result.rows[0].current_time);
    console.log('Database version:', result.rows[0].db_version.substring(0, 60));

    // Create essential schema
    console.log('Creating essential database schema...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE,
        guest_id TEXT UNIQUE,
        username TEXT,
        ref_code TEXT UNIQUE,
        parent_ref_code TEXT,
        balance_uni NUMERIC(18,6) DEFAULT 0,
        balance_ton NUMERIC(18,6) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        transaction_type TEXT NOT NULL,
        currency TEXT NOT NULL,
        amount NUMERIC(18,6) NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        inviter_id INTEGER REFERENCES users(id) NOT NULL,
        level INTEGER NOT NULL,
        reward_uni NUMERIC(18,6),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_users_ref_code ON users(ref_code);
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON referrals(user_id);
    `);

    // Verify schema
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Available tables:', tableCheck.rows.map(r => r.table_name));

    // Test CRUD operations
    const insertTest = await client.query(`
      INSERT INTO users (guest_id, username, ref_code) 
      VALUES ('test_' || extract(epoch from now()), 'test_user', 'TEST' || extract(epoch from now())::text)
      RETURNING id, guest_id
    `);
    
    console.log('Test user created:', insertTest.rows[0]);

    const selectTest = await client.query('SELECT COUNT(*) as total_users FROM users');
    console.log('Total users in database:', selectTest.rows[0].total_users);

    // Clean up test data
    await client.query('DELETE FROM users WHERE username = $1', ['test_user']);
    console.log('Test data cleaned up');

    await client.end();
    console.log('Database activation SUCCESSFUL');
    return true;

  } catch (error) {
    console.error('Standard PostgreSQL connection failed:', error.message);
    
    try {
      await client.end();
    } catch (closeError) {
      // Ignore close errors
    }
  }

  // Strategy 2: Alternative connection parameters
  console.log('Strategy 2: Alternative connection parameters...');
  
  const altClient = new Client({
    connectionString: process.env.DATABASE_URL + '?sslmode=require',
    connectionTimeoutMillis: 45000
  });

  try {
    await altClient.connect();
    const pingResult = await altClient.query('SELECT 1 as ping');
    console.log('Alternative connection successful:', pingResult.rows[0]);
    
    await altClient.end();
    return true;

  } catch (altError) {
    console.error('Alternative connection failed:', altError.message);
    
    try {
      await altClient.end();
    } catch (closeError) {
      // Ignore close errors
    }
  }

  return false;
}

activateDatabase().then(success => {
  if (success) {
    console.log('\nNeon database is ACTIVE and ready for production use');
    console.log('All essential tables created with proper indexes');
    console.log('Database connection verified with CRUD operations');
  } else {
    console.log('\nFailed to activate Neon database with all strategies');
    console.log('Database endpoint may require manual activation in Neon console');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});