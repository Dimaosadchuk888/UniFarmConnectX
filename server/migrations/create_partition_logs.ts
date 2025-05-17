import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';
import { db } from '../db';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function log(message: string) {
  console.log(`[Migration] ${message}`);
}

async function executeQuery(query: string, params: any[] = []) {
  try {
    const result = await pool.query(query, params);
    return result;
  } catch (error: any) {
    console.error(`SQL Error: ${error.message}`);
    console.error(`Query: ${query}`);
    console.error(`Params: ${JSON.stringify(params)}`);
    throw error;
  }
}

export async function createPartitionLogs() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS partition_logs (
      id SERIAL PRIMARY KEY,
      operation_type VARCHAR(50) NOT NULL,
      partition_name VARCHAR(100) NOT NULL,
      status VARCHAR(20) NOT NULL,
      details TEXT,
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'partition_logs' 
        AND column_name = 'error_message'
      ) THEN
        ALTER TABLE partition_logs ADD COLUMN error_message TEXT;
      END IF;
    END $$;
  `);
  log('Created/Updated partition_logs table');
}

export async function runMigration() {
  try {
    log('Starting migration: Creating partition_logs table');

    const tableExistsResult = await executeQuery(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partition_logs')"
    );

    const tableExists = tableExistsResult.rows[0].exists;
    if (tableExists) {
      log('Table partition_logs already exists. Adding error_message column if missing...');

      const columnExistsResult = await executeQuery(
        "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partition_logs' AND column_name = 'error_message')"
      );

      if (!columnExistsResult.rows[0].exists) {
        await executeQuery('ALTER TABLE partition_logs ADD COLUMN IF NOT EXISTS error_message TEXT');
        log('Added error_message column');
      }
      return;
    }

    await executeQuery('BEGIN');

    try {
      log('Creating partition_logs table');
      await createPartitionLogs();

      await executeQuery('COMMIT');
      log('Migration completed successfully');
    } catch (error) {
      log('Error during migration. Rolling back.');
      await executeQuery('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    log(`Migration failed: ${error.message}`);
    console.error(error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Если скрипт запускается напрямую, выполняем миграцию
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}