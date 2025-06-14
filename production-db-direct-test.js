/**
 * Direct connection test to actual production database ep-lucky-boat-a463bggt
 */

import pkg from 'pg';
const { Client } = pkg;

// Direct production database connection
const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function testActualProductionDB() {
  const client = new Client({ connectionString: PRODUCTION_DB_URL });
  
  try {
    console.log('🔌 Connecting to ACTUAL production database ep-lucky-boat-a463bggt...');
    await client.connect();
    
    // Check current state
    const countResult = await client.query('SELECT COUNT(*) FROM users;');
    console.log('📊 Current users count in ACTUAL production DB:', countResult.rows[0].count);
    
    // Show current users
    const usersResult = await client.query('SELECT id, telegram_id, username, ref_code FROM users ORDER BY id;');
    console.log('👥 Current users in ACTUAL production DB:');
    usersResult.rows.forEach(user => {
      console.log(`   ID: ${user.id}, telegram_id: ${user.telegram_id}, username: ${user.username}, ref_code: ${user.ref_code}`);
    });
    
    // Check sequence
    const seqResult = await client.query('SELECT last_value FROM users_id_seq;');
    console.log('🔢 Current sequence last_value:', seqResult.rows[0].last_value);
    
    console.log('✅ Successfully connected to ACTUAL production database');
    
  } catch (error) {
    console.error('❌ Error connecting to ACTUAL production database:', error.message);
  } finally {
    await client.end();
  }
}

testActualProductionDB().catch(console.error);