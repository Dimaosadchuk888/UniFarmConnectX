/**
 * Complete cleanup of actual production database ep-lucky-boat-a463bggt
 */

import pkg from 'pg';
const { Client } = pkg;

const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function cleanProductionDB() {
  const client = new Client({ connectionString: PRODUCTION_DB_URL });
  
  try {
    console.log('🧹 Starting complete cleanup of production database ep-lucky-boat-a463bggt...');
    await client.connect();
    
    // 1. Full cleanup with CASCADE to handle any foreign keys
    console.log('🗑️ Truncating users table with RESTART IDENTITY CASCADE...');
    await client.query('TRUNCATE users RESTART IDENTITY CASCADE;');
    
    // 2. Verify cleanup
    const countResult = await client.query('SELECT COUNT(*) FROM users;');
    console.log('📊 Users count after cleanup:', countResult.rows[0].count);
    
    // 3. Check sequence reset
    const seqResult = await client.query('SELECT last_value FROM users_id_seq;');
    console.log('🔢 Sequence last_value after reset:', seqResult.rows[0].last_value);
    
    // 4. Test registration with first user
    console.log('🧪 Testing registration of first user...');
    const insertResult = await client.query(
      `INSERT INTO users (telegram_id, username, ref_code, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING id, telegram_id, username, ref_code`,
      [777000999, 'production_user_1', 'PROD001']
    );
    
    const newUser = insertResult.rows[0];
    console.log('✅ First user registered:', {
      id: newUser.id,
      telegram_id: newUser.telegram_id,
      username: newUser.username,
      ref_code: newUser.ref_code
    });
    
    // 5. Verify the user got ID = 1
    if (newUser.id === 1) {
      console.log('✅ Perfect! User got ID = 1 as expected');
    } else {
      console.log(`⚠️ User got ID = ${newUser.id}, expected ID = 1`);
    }
    
    // 6. Final state check
    const finalCount = await client.query('SELECT COUNT(*) FROM users;');
    const finalSeq = await client.query('SELECT last_value FROM users_id_seq;');
    
    console.log('📋 Final state:');
    console.log(`   Users count: ${finalCount.rows[0].count}`);
    console.log(`   Sequence value: ${finalSeq.rows[0].last_value}`);
    
    console.log('🎉 Production database is now clean and ready for launch!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await client.end();
  }
}

cleanProductionDB().catch(console.error);