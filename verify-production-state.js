/**
 * Verify final production database state
 */

import pkg from 'pg';
const { Client } = pkg;

const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function verifyState() {
  const client = new Client({ connectionString: PRODUCTION_DB_URL });
  
  try {
    await client.connect();
    
    // Check users table
    const users = await client.query('SELECT * FROM users ORDER BY id;');
    console.log('Users in production DB:', users.rows.length);
    
    // Check sequence state
    const seq = await client.query('SELECT last_value, is_called FROM users_id_seq;');
    console.log('Sequence state:', seq.rows[0]);
    
    // Test that next insert gets ID 1
    const testInsert = await client.query(
      'INSERT INTO users (telegram_id, username, ref_code) VALUES ($1, $2, $3) RETURNING id',
      [777000999, 'production_user_1', 'PROD001']
    );
    console.log('Test user got ID:', testInsert.rows[0].id);
    
    // Clean up test user
    await client.query('DELETE FROM users WHERE telegram_id = 777000999');
    await client.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
    
    // Final verification
    const finalCount = await client.query('SELECT COUNT(*) FROM users');
    console.log('Final user count:', finalCount.rows[0].count);
    
    console.log('Production database verified and ready');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

verifyState().catch(console.error);