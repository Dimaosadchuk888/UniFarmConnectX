/**
 * Database Connection Test for Neon Production DB
 * Tests actual connection and basic table access
 */

import { db, pool } from './server/db.ts';
import { users } from './shared/schema.ts';
import { count } from 'drizzle-orm';

async function testDatabaseConnection() {
  console.log('🔗 Testing Neon Database Connection...');
  
  try {
    // Test 1: Basic connection
    console.log('1. Testing basic connection...');
    const basicQuery = await pool.query('SELECT 1 as test');
    console.log('✅ Basic connection successful:', basicQuery.rows[0]);

    // Test 2: Schema validation - check if users table exists
    console.log('2. Testing users table access...');
    const userCount = await db.select({ count: count() }).from(users);
    console.log('✅ Users table accessible, count:', userCount[0]?.count || 0);

    // Test 3: Connection info
    console.log('3. Connection details...');
    const connectionInfo = await pool.query('SELECT current_database(), current_user, version()');
    console.log('✅ Database:', connectionInfo.rows[0].current_database);
    console.log('✅ User:', connectionInfo.rows[0].current_user);
    console.log('✅ Version:', connectionInfo.rows[0].version.substring(0, 50) + '...');

    // Test 4: Get one user if exists
    console.log('4. Testing data access...');
    try {
      const sampleUser = await db.select().from(users).limit(1);
      if (sampleUser.length > 0) {
        console.log('✅ Sample user found:', {
          id: sampleUser[0].id,
          username: sampleUser[0].username,
          has_ref_code: !!sampleUser[0].ref_code
        });
      } else {
        console.log('ℹ️ No users in database yet - table is empty but accessible');
      }
    } catch (userError) {
      console.log('⚠️ Users table might not exist yet:', userError.message);
    }

    console.log('\n🎉 Database connection test PASSED - Neon DB is active and ready');
    return true;

  } catch (error) {
    console.error('❌ Database connection test FAILED:', error.message);
    console.error('Stack:', error.stack);
    return false;
  } finally {
    // Clean up connection
    try {
      await pool.end();
      console.log('🔌 Connection pool closed');
    } catch (closeError) {
      console.warn('⚠️ Error closing connection:', closeError.message);
    }
  }
}

// Run the test
testDatabaseConnection().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});