import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

async function createFarmingTables() {
  try {
    logger.info('[CreateTables] Starting table creation...');

    // Создаем таблицу uni_farming_data
    logger.info('[CreateTables] Creating uni_farming_data table...');
    const { data: uniTable, error: uniError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS uni_farming_data (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            deposit_amount NUMERIC(20, 9) DEFAULT 0,
            farming_balance NUMERIC(20, 9) DEFAULT 0,
            farming_rate NUMERIC(10, 6) DEFAULT 0.01,
            farming_start_timestamp TIMESTAMP WITH TIME ZONE,
            farming_last_update TIMESTAMP WITH TIME ZONE,
            farming_deposit NUMERIC(20, 9) DEFAULT 0,
            is_active BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Создаем индексы для uni_farming_data
        CREATE INDEX IF NOT EXISTS idx_uni_farming_active ON uni_farming_data(is_active);
        CREATE INDEX IF NOT EXISTS idx_uni_farming_updated ON uni_farming_data(farming_last_update);
      `
    });

    if (uniError) {
      logger.error('[CreateTables] Error creating uni_farming_data:', uniError);
      
      // Пробуем альтернативный подход - создать через обычный insert с конфликтом
      logger.info('[CreateTables] Trying alternative approach for uni_farming_data...');
      
      // Проверяем, можем ли мы вставить данные (если таблица существует)
      const { error: testError } = await supabase
        .from('uni_farming_data')
        .select('user_id')
        .limit(1);
        
      if (testError?.code === '42P01') {
        logger.error('[CreateTables] Table uni_farming_data definitely does not exist. Need manual creation in Supabase Dashboard.');
      } else if (!testError) {
        logger.info('[CreateTables] Table uni_farming_data already exists!');
      }
    } else {
      logger.info('[CreateTables] uni_farming_data table created successfully');
    }

    // Создаем таблицу ton_farming_data
    logger.info('[CreateTables] Creating ton_farming_data table...');
    const { data: tonTable, error: tonError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ton_farming_data (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            farming_balance NUMERIC(20, 9) DEFAULT 0,
            farming_rate NUMERIC(10, 6) DEFAULT 0.01,
            farming_start_timestamp TIMESTAMP WITH TIME ZONE,
            farming_last_update TIMESTAMP WITH TIME ZONE,
            farming_accumulated NUMERIC(20, 9) DEFAULT 0,
            farming_last_claim TIMESTAMP WITH TIME ZONE,
            boost_active BOOLEAN DEFAULT FALSE,
            boost_package_id INTEGER,
            boost_expires_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Создаем индексы для ton_farming_data
        CREATE INDEX IF NOT EXISTS idx_ton_farming_active ON ton_farming_data(boost_active);
        CREATE INDEX IF NOT EXISTS idx_ton_farming_updated ON ton_farming_data(farming_last_update);
      `
    });

    if (tonError) {
      logger.error('[CreateTables] Error creating ton_farming_data:', tonError);
      
      // Проверяем существование таблицы
      const { error: testError } = await supabase
        .from('ton_farming_data')
        .select('user_id')
        .limit(1);
        
      if (testError?.code === '42P01') {
        logger.error('[CreateTables] Table ton_farming_data definitely does not exist. Need manual creation in Supabase Dashboard.');
      } else if (!testError) {
        logger.info('[CreateTables] Table ton_farming_data already exists!');
      }
    } else {
      logger.info('[CreateTables] ton_farming_data table created successfully');
    }

    // Если RPC не работает, выводим SQL для ручного выполнения
    if ((uniError || tonError) && (uniError?.message?.includes('function') || tonError?.message?.includes('function'))) {
      console.log('\n[CreateTables] RPC function not found. Please execute the following SQL manually in Supabase SQL Editor:\n');
      console.log('-- Create uni_farming_data table');
      console.log(`CREATE TABLE IF NOT EXISTS uni_farming_data (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    deposit_amount NUMERIC(20, 9) DEFAULT 0,
    farming_balance NUMERIC(20, 9) DEFAULT 0,
    farming_rate NUMERIC(10, 6) DEFAULT 0.01,
    farming_start_timestamp TIMESTAMP WITH TIME ZONE,
    farming_last_update TIMESTAMP WITH TIME ZONE,
    farming_deposit NUMERIC(20, 9) DEFAULT 0,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_uni_farming_active ON uni_farming_data(is_active);
CREATE INDEX IF NOT EXISTS idx_uni_farming_updated ON uni_farming_data(farming_last_update);

-- Create ton_farming_data table
CREATE TABLE IF NOT EXISTS ton_farming_data (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    farming_balance NUMERIC(20, 9) DEFAULT 0,
    farming_rate NUMERIC(10, 6) DEFAULT 0.01,
    farming_start_timestamp TIMESTAMP WITH TIME ZONE,
    farming_last_update TIMESTAMP WITH TIME ZONE,
    farming_accumulated NUMERIC(20, 9) DEFAULT 0,
    farming_last_claim TIMESTAMP WITH TIME ZONE,
    boost_active BOOLEAN DEFAULT FALSE,
    boost_package_id INTEGER,
    boost_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ton_farming_active ON ton_farming_data(boost_active);
CREATE INDEX IF NOT EXISTS idx_ton_farming_updated ON ton_farming_data(farming_last_update);`);
    }

    console.log('\n[CreateTables] Process completed!');

  } catch (error) {
    logger.error('[CreateTables] Fatal error:', error);
    console.error('[CreateTables] Fatal error:', error);
  }
}

// Запускаем создание таблиц
createFarmingTables();