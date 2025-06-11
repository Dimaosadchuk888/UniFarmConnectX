/**
 * Database Initialization Script
 * Creates tables and activates Neon database through schema deployment
 */

import { Pool } from '@neondatabase/serverless';

async function initializeDatabase() {
  console.log('Initializing Neon database...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found');
    return false;
  }

  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 60000
  });

  try {
    // Create users table first (core dependency)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE,
        guest_id TEXT UNIQUE,
        username TEXT,
        wallet TEXT,
        ton_wallet_address TEXT,
        ref_code TEXT UNIQUE,
        parent_ref_code TEXT,
        referred_by INTEGER,
        balance_uni NUMERIC(18,6) DEFAULT 0,
        balance_ton NUMERIC(18,6) DEFAULT 0,
        uni_deposit_amount NUMERIC(18,6) DEFAULT 0,
        uni_farming_start_timestamp TIMESTAMP,
        uni_farming_balance NUMERIC(18,6) DEFAULT 0,
        uni_farming_rate NUMERIC(18,6) DEFAULT 0,
        uni_farming_last_update TIMESTAMP,
        uni_farming_deposit NUMERIC(18,6) DEFAULT 0,
        uni_farming_activated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        checkin_last_date TIMESTAMP,
        checkin_streak INTEGER DEFAULT 0
      )
    `);

    // Create indexes for users table
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_parent_ref_code ON users(parent_ref_code);
      CREATE INDEX IF NOT EXISTS idx_users_ref_code ON users(ref_code);
      CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
    `);

    // Create transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        transaction_type TEXT NOT NULL,
        currency TEXT NOT NULL,
        amount NUMERIC(18,6) NOT NULL,
        status TEXT DEFAULT 'pending',
        source TEXT,
        category TEXT,
        tx_hash TEXT,
        description TEXT,
        source_user_id INTEGER,
        wallet_address TEXT,
        data TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for transactions
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_source_user_id ON transactions(source_user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(transaction_type, status);
    `);

    // Create referrals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        inviter_id INTEGER REFERENCES users(id) NOT NULL,
        level INTEGER NOT NULL,
        reward_uni NUMERIC(18,6),
        reward_ton NUMERIC(18,6),
        ref_path JSON,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for referrals
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON referrals(user_id);
      CREATE INDEX IF NOT EXISTS idx_referrals_inviter_id ON referrals(inviter_id);
      CREATE INDEX IF NOT EXISTS idx_referrals_user_inviter ON referrals(user_id, inviter_id);
      CREATE INDEX IF NOT EXISTS idx_referrals_level ON referrals(level);
    `);

    // Test basic operations
    const testResult = await pool.query('SELECT COUNT(*) as user_count FROM users');
    console.log('Database initialized successfully');
    console.log('Current user count:', testResult.rows[0].user_count);

    // Verify table structure
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'transactions', 'referrals')
      ORDER BY table_name
    `);
    
    console.log('Created tables:', tableCheck.rows.map(r => r.table_name));
    
    return true;

  } catch (error) {
    console.error('Database initialization failed:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

initializeDatabase().then(success => {
  console.log(success ? 'Database ready for production use' : 'Database initialization failed');
  process.exit(success ? 0 : 1);
});