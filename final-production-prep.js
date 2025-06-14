/**
 * Final production preparation - remove test user and reset for launch
 */

import pkg from 'pg';
const { Client } = pkg;

const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function finalPrep() {
  const client = new Client({ connectionString: PRODUCTION_DB_URL });
  
  try {
    console.log('🎯 Final production preparation...');
    await client.connect();
    
    // Remove test user and reset sequence
    await client.query('DELETE FROM users WHERE telegram_id = 777000999;');
    await client.query('ALTER SEQUENCE users_id_seq RESTART WITH 1;');
    
    // Verify empty state
    const count = await client.query('SELECT COUNT(*) FROM users;');
    const seq = await client.query('SELECT last_value FROM users_id_seq;');
    
    console.log(`Users count: ${count.rows[0].count}`);
    console.log(`Sequence value: ${seq.rows[0].last_value}`);
    
    if (count.rows[0].count === '0' && seq.rows[0].last_value === 1) {
      console.log('✅ Production database is empty and ready for real users');
    } else {
      console.log('⚠️ Database not in expected state');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

finalPrep().catch(console.error);