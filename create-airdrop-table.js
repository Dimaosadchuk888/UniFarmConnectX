/**
 * Creates airdrop_participants table in production database
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const PRODUCTION_DATABASE_URL = 'postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function createAirdropTable() {
  console.log('🔧 Создание таблицы airdrop_participants...');
  
  const pool = new Pool({ connectionString: PRODUCTION_DATABASE_URL });

  try {
    const client = await pool.connect();
    
    // Create airdrop_participants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS airdrop_participants (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL UNIQUE,
        user_id INTEGER REFERENCES users(id),
        registered_at TIMESTAMP DEFAULT NOW() NOT NULL,
        status TEXT DEFAULT 'active'
      )
    `);
    
    console.log('✅ Таблица airdrop_participants создана успешно');
    
    // Test the table
    const testResult = await client.query('SELECT COUNT(*) FROM airdrop_participants');
    console.log(`✅ Проверка таблицы: ${testResult.rows[0].count} записей`);
    
    client.release();
    await pool.end();
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка создания таблицы:', error.message);
    await pool.end();
    return false;
  }
}

createAirdropTable();