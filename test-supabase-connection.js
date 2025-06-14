#!/usr/bin/env node
/**
 * Test Supabase Database Connection
 * Verifies DATABASE_URL connection and runs the requested SQL query
 */

import { db } from './core/db.js';
import { sql } from 'drizzle-orm';

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase database connection...');
  
  try {
    // Test basic connection
    console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);
    
    // Run the requested SQL query
    const result = await db.execute(sql`
      SELECT current_database(), current_schema(), inet_server_addr();
    `);
    
    console.log('✅ Database connection successful!');
    console.log('Query result:', result.rows[0]);
    
    // Test table existence
    const tablesResult = await db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📋 Available tables:');
    tablesResult.rows.forEach(row => {
      console.log('  -', row.table_name);
    });
    
    return {
      success: true,
      database: result.rows[0],
      tables: tablesResult.rows
    };
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    // Additional debugging
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.detail) {
      console.error('Error detail:', error.detail);
    }
    
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

// Run the test
testSupabaseConnection()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 Supabase connection test completed successfully');
    } else {
      console.log('\n💥 Supabase connection test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });