/**
 * Test Supabase Database Connection
 * Verifies the new DATABASE_URL connection and checks table access
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Database Connection');
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 30) + '...');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment variables');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Test basic connection
    console.log('\n🔗 Testing basic connection...');
    const basicTest = await pool.query('SELECT 1 as test');
    console.log('✅ Basic connection successful:', basicTest.rows[0]);

    // Get database info
    console.log('\n📊 Getting database information...');
    const dbInfo = await pool.query('SELECT current_database(), current_schema(), inet_server_addr(), version()');
    const info = dbInfo.rows[0];
    
    console.log('✅ Database Information:');
    console.log('  - Database:', info.current_database);
    console.log('  - Schema:', info.current_schema);
    console.log('  - Server IP:', info.inet_server_addr);
    console.log('  - PostgreSQL Version:', info.version?.substring(0, 50) + '...');

    // Check if users table exists
    console.log('\n🗂️  Checking users table...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    const usersTableExists = tableCheck.rows[0].exists;
    console.log('Users table exists:', usersTableExists);

    if (usersTableExists) {
      // Count users
      const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log('✅ Users table accessible, count:', userCount.rows[0].count);

      // Show table structure
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position;
      `);
      console.log('✅ Users table structure:');
      structure.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
      });
    } else {
      console.log('⚠️  Users table does not exist - needs migration');
    }

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await pool.end();
    console.log('\n🔚 Connection closed');
  }
}

testSupabaseConnection();