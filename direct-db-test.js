/**
 * Direct Database URL Test
 * Tests DATABASE_URL without additional configurations
 */

import pg from 'pg';
const { Client } = pg;

async function testDirectConnection() {
  console.log('Testing direct DATABASE_URL connection...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found in environment');
    return false;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 30000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connection established');

    const result = await client.query('SELECT 1 as test, NOW() as current_time');
    console.log('Query successful:', result.rows[0]);

    // Test table creation
    await client.query(`
      CREATE TABLE IF NOT EXISTS connection_test (
        id SERIAL PRIMARY KEY,
        test_time TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Table creation successful');

    const insertResult = await client.query(`
      INSERT INTO connection_test DEFAULT VALUES RETURNING id, test_time
    `);
    console.log('Insert successful:', insertResult.rows[0]);

    const selectResult = await client.query('SELECT COUNT(*) as total FROM connection_test');
    console.log('Total test records:', selectResult.rows[0].total);

    await client.query('DROP TABLE connection_test');
    console.log('Cleanup successful');

    return true;

  } catch (error) {
    console.error('Database test failed:', error.message);
    return false;
  } finally {
    try {
      await client.end();
      console.log('Connection closed');
    } catch (err) {
      console.warn('Error closing connection:', err.message);
    }
  }
}

testDirectConnection().then(success => {
  console.log(success ? 'Database connection ACTIVE' : 'Database connection FAILED');
  process.exit(success ? 0 : 1);
});