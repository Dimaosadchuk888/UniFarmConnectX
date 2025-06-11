/**
 * Neon Database Wake-up Script
 * Activates sleeping Neon database endpoint
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

async function wakeUpNeonDatabase() {
  console.log('⏰ Waking up Neon Database...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment');
    return false;
  }

  // Create a new pool with extended timeout for wake-up
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 60000, // 60 seconds timeout
    idleTimeoutMillis: 30000
  });

  try {
    console.log('🔄 Attempting to wake database with extended timeout...');
    
    // Make a simple query to wake up the database
    const start = Date.now();
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    const duration = Date.now() - start;
    
    console.log('✅ Database awakened successfully!');
    console.log(`⚡ Wake-up time: ${duration}ms`);
    console.log('🕐 Current time:', result.rows[0].current_time);
    console.log('📊 Database version:', result.rows[0].db_version.substring(0, 50) + '...');
    
    // Test basic table creation capability
    console.log('🔧 Testing table access...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wake_test (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      INSERT INTO wake_test DEFAULT VALUES
    `);
    
    const testResult = await pool.query('SELECT COUNT(*) as count FROM wake_test');
    console.log('✅ Table operations working, test records:', testResult.rows[0].count);
    
    // Clean up test table
    await pool.query('DROP TABLE IF EXISTS wake_test');
    console.log('🧹 Test table cleaned up');
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to wake database:', error.message);
    
    if (error.message.includes('endpoint is disabled')) {
      console.log('💡 Suggestion: Database endpoint might need manual activation in Neon console');
      console.log('💡 Or try again in a few moments as it might be starting up');
    }
    
    return false;
    
  } finally {
    try {
      await pool.end();
      console.log('🔌 Connection pool closed');
    } catch (closeError) {
      console.warn('⚠️ Error closing connection:', closeError.message);
    }
  }
}

// Run wake-up
wakeUpNeonDatabase().then(success => {
  if (success) {
    console.log('\n🎉 Neon database is now active and ready for connections');
  } else {
    console.log('\n❌ Failed to activate Neon database');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});