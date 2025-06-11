/**
 * Neon Database Persistent Activator
 * Continuously attempts to wake up and maintain Neon database connection
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

async function persistentActivation() {
  console.log('Starting Neon database persistent activation...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found');
    return false;
  }

  const maxAttempts = 10;
  const retryDelay = 15000; // 15 seconds between attempts
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Attempt ${attempt}/${maxAttempts}: Testing database connection...`);
    
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 45000,
      idleTimeoutMillis: 30000
    });

    try {
      const start = Date.now();
      const result = await pool.query('SELECT NOW() as wake_time, current_database() as db_name');
      const duration = Date.now() - start;
      
      console.log(`SUCCESS! Database active after ${duration}ms`);
      console.log('Database name:', result.rows[0].db_name);
      console.log('Current time:', result.rows[0].wake_time);
      
      // Verify schema access
      const schemaTest = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        LIMIT 5
      `);
      
      console.log('Available tables:', schemaTest.rows.map(r => r.table_name));
      
      await pool.end();
      return true;
      
    } catch (error) {
      console.log(`Attempt ${attempt} failed: ${error.message}`);
      
      try {
        await pool.end();
      } catch (closeError) {
        // Ignore close errors
      }
      
      if (attempt < maxAttempts) {
        console.log(`Waiting ${retryDelay/1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  console.log('All activation attempts failed');
  return false;
}

persistentActivation().then(success => {
  if (success) {
    console.log('Neon database is now ACTIVE and ready');
  } else {
    console.log('Failed to activate Neon database after all attempts');
  }
  process.exit(success ? 0 : 1);
});