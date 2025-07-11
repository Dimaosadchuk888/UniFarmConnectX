import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

async function applyPhase2Optimization() {
  try {
    logger.info('[Phase2Optimization] Starting database optimization...');

    // SQL для создания таблицы uni_farming_data
    const createUniFarmingTable = `
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
    `;

    // SQL для создания таблицы ton_farming_data
    const createTonFarmingTable = `
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
    `;

    // Миграция данных из таблицы users в uni_farming_data
    const migrateUniFarmingData = `
      INSERT INTO uni_farming_data (
          user_id,
          deposit_amount,
          farming_balance,
          farming_rate,
          farming_start_timestamp,
          farming_last_update,
          farming_deposit,
          is_active
      )
      SELECT 
          id as user_id,
          COALESCE(uni_deposit_amount, 0) as deposit_amount,
          COALESCE(uni_farming_balance, 0) as farming_balance,
          COALESCE(uni_farming_rate, 0.01) as farming_rate,
          uni_farming_start_timestamp,
          uni_farming_last_update,
          COALESCE(uni_farming_deposit, 0) as farming_deposit,
          COALESCE(uni_farming_active, false) as is_active
      FROM users
      WHERE uni_farming_active = true OR uni_deposit_amount > 0
      ON CONFLICT (user_id) DO NOTHING;
    `;

    // Миграция данных из таблицы users в ton_farming_data
    const migrateTonFarmingData = `
      INSERT INTO ton_farming_data (
          user_id,
          farming_balance,
          farming_rate,
          farming_start_timestamp,
          farming_last_update,
          farming_accumulated,
          farming_last_claim,
          boost_active,
          boost_package_id,
          boost_expires_at
      )
      SELECT 
          id as user_id,
          COALESCE(ton_farming_balance, 0) as farming_balance,
          COALESCE(ton_farming_rate, 0.01) as farming_rate,
          ton_farming_start_timestamp,
          ton_farming_last_update,
          COALESCE(ton_farming_accumulated, 0) as farming_accumulated,
          ton_farming_last_claim,
          COALESCE(ton_boost_active, false) as boost_active,
          ton_boost_package_id,
          ton_boost_expires_at
      FROM users
      WHERE ton_boost_active = true OR ton_farming_balance > 0
      ON CONFLICT (user_id) DO NOTHING;
    `;

    // Создание индексов
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_uni_farming_active ON uni_farming_data(is_active);
      CREATE INDEX IF NOT EXISTS idx_ton_farming_active ON ton_farming_data(boost_active);
      CREATE INDEX IF NOT EXISTS idx_uni_farming_updated ON uni_farming_data(farming_last_update);
      CREATE INDEX IF NOT EXISTS idx_ton_farming_updated ON ton_farming_data(farming_last_update);
    `;

    // Выполняем все SQL команды
    console.log('[Phase2Optimization] Creating uni_farming_data table...');
    const { error: uniTableError } = await supabase.rpc('execute_sql', { sql: createUniFarmingTable });
    if (uniTableError) {
      logger.error('[Phase2Optimization] Error creating uni_farming_data table:', uniTableError);
    } else {
      logger.info('[Phase2Optimization] uni_farming_data table created successfully');
    }

    console.log('[Phase2Optimization] Creating ton_farming_data table...');
    const { error: tonTableError } = await supabase.rpc('execute_sql', { sql: createTonFarmingTable });
    if (tonTableError) {
      logger.error('[Phase2Optimization] Error creating ton_farming_data table:', tonTableError);
    } else {
      logger.info('[Phase2Optimization] ton_farming_data table created successfully');
    }

    console.log('[Phase2Optimization] Migrating UNI farming data...');
    const { error: uniMigrateError } = await supabase.rpc('execute_sql', { sql: migrateUniFarmingData });
    if (uniMigrateError) {
      logger.error('[Phase2Optimization] Error migrating UNI farming data:', uniMigrateError);
    } else {
      logger.info('[Phase2Optimization] UNI farming data migrated successfully');
    }

    console.log('[Phase2Optimization] Migrating TON farming data...');
    const { error: tonMigrateError } = await supabase.rpc('execute_sql', { sql: migrateTonFarmingData });
    if (tonMigrateError) {
      logger.error('[Phase2Optimization] Error migrating TON farming data:', tonMigrateError);
    } else {
      logger.info('[Phase2Optimization] TON farming data migrated successfully');
    }

    console.log('[Phase2Optimization] Creating indexes...');
    const { error: indexError } = await supabase.rpc('execute_sql', { sql: createIndexes });
    if (indexError) {
      logger.error('[Phase2Optimization] Error creating indexes:', indexError);
    } else {
      logger.info('[Phase2Optimization] Indexes created successfully');
    }

    // Проверяем результаты
    const { data: uniCount } = await supabase
      .from('uni_farming_data')
      .select('user_id', { count: 'exact' });

    const { data: tonCount } = await supabase
      .from('ton_farming_data')
      .select('user_id', { count: 'exact' });

    logger.info('[Phase2Optimization] Migration complete:', {
      uniFarmingRecords: uniCount?.length || 0,
      tonFarmingRecords: tonCount?.length || 0
    });

    console.log('[Phase2Optimization] Phase 2 optimization completed successfully!');

  } catch (error) {
    logger.error('[Phase2Optimization] Fatal error:', error);
    console.error('[Phase2Optimization] Fatal error:', error);
    process.exit(1);
  }
}

// Запускаем миграцию
applyPhase2Optimization();