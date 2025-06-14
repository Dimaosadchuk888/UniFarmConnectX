/**
 * Complete migration from Neon to Supabase
 * Migrates schema and data to new Supabase instance
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Old Neon connection
const oldPool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_se2TFlALGXP5@ep-rough-boat-admw3omm.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require",
  ssl: { rejectUnauthorized: false }
});

// New Supabase connection using provided DATABASE_URL secret
const newPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateToSupabase() {
  console.log('🚀 Starting migration from Neon to Supabase');
  
  try {
    // Test both connections
    console.log('\n🔍 Testing old Neon connection...');
    const oldTest = await oldPool.query('SELECT current_database(), count(*) as user_count FROM users');
    console.log('✅ Old Neon database:', oldTest.rows[0].current_database, 'Users:', oldTest.rows[0].user_count);

    console.log('\n🔍 Testing new Supabase connection...');
    const newTest = await newPool.query('SELECT current_database(), current_schema()');
    console.log('✅ New Supabase database:', newTest.rows[0].current_database, 'Schema:', newTest.rows[0].current_schema);

    // Get users table schema from old database
    console.log('\n📋 Extracting users table schema...');
    const schemaQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `;
    const schema = await oldPool.query(schemaQuery);
    
    // Create users table in Supabase
    console.log('\n🏗️  Creating users table in Supabase...');
    const createTableSQL = generateCreateTableSQL(schema.rows);
    await newPool.query(createTableSQL);
    console.log('✅ Users table created in Supabase');

    // Migrate data
    console.log('\n📤 Migrating user data...');
    const users = await oldPool.query('SELECT * FROM users ORDER BY id');
    console.log(`Found ${users.rows.length} users to migrate`);

    if (users.rows.length > 0) {
      // Insert users into Supabase with proper data formatting
      for (const user of users.rows) {
        const columns = Object.keys(user);
        const values = Object.values(user).map((v, index) => {
          if (v === null) return null;
          
          // Handle timestamp fields
          const columnName = columns[index];
          if (columnName.includes('_at') || columnName.includes('_time') || columnName === 'created_at' || columnName === 'updated_at' || columnName === 'last_active' || columnName === 'last_daily_bonus' || columnName === 'last_uni_claim' || columnName === 'last_ton_claim' || columnName === 'boost_expiry' || columnName === 'farming_boost_expires_at' || columnName === 'checkin_last_date') {
            if (v instanceof Date) {
              return v.toISOString();
            } else if (typeof v === 'string' && v.includes('GMT')) {
              return new Date(v).toISOString();
            } else {
              return v;
            }
          }
          
          return v;
        });
        
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const insertSQL = `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders})`;
        await newPool.query(insertSQL, values);
      }
      console.log('✅ All user data migrated successfully');
    }

    // Update sequence
    console.log('\n🔢 Updating ID sequence...');
    const maxId = await newPool.query('SELECT MAX(id) as max_id FROM users');
    const nextId = (maxId.rows[0].max_id || 0) + 1;
    await newPool.query(`ALTER SEQUENCE users_id_seq RESTART WITH ${nextId}`);
    console.log(`✅ Sequence updated to start from ${nextId}`);

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const verification = await newPool.query('SELECT COUNT(*) as count FROM users');
    console.log('✅ Verification successful:', verification.rows[0].count, 'users in Supabase');

    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ Supabase is now ready to use as the primary database');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await oldPool.end();
    await newPool.end();
  }
}

function generateCreateTableSQL(columns) {
  const columnDefs = columns.map(col => {
    let def = `${col.column_name} `;
    
    // Map data types
    switch (col.data_type) {
      case 'bigint':
        def += 'BIGINT';
        break;
      case 'integer':
        def += col.column_name === 'id' ? 'SERIAL PRIMARY KEY' : 'INTEGER';
        break;
      case 'character varying':
        def += 'VARCHAR';
        break;
      case 'numeric':
        def += 'DECIMAL';
        break;
      case 'boolean':
        def += 'BOOLEAN';
        break;
      case 'timestamp without time zone':
        def += 'TIMESTAMP';
        break;
      case 'date':
        def += 'DATE';
        break;
      case 'text':
        def += 'TEXT';
        break;
      case 'jsonb':
        def += 'JSONB';
        break;
      default:
        def += col.data_type.toUpperCase();
    }

    if (col.is_nullable === 'NO' && col.column_name !== 'id') {
      def += ' NOT NULL';
    }

    if (col.column_default && col.column_name !== 'id') {
      def += ` DEFAULT ${col.column_default}`;
    }

    return def;
  }).filter(def => !def.includes('SERIAL PRIMARY KEY'));

  return `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      ${columnDefs.join(',\n      ')}
    );
  `;
}

migrateToSupabase();