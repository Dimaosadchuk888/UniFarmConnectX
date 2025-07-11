import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

async function createFarmingTables() {
  console.log('\n=== CREATING FARMING TABLES IN PRODUCTION ===\n');
  
  try {
    // 1. Создаем таблицу uni_farming_data
    console.log('1. Creating uni_farming_data table...');
    const { error: uniError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS uni_farming_data (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE,
          deposit_amount NUMERIC(20, 9) DEFAULT 0,
          farming_balance NUMERIC(20, 9) DEFAULT 0,
          total_earned NUMERIC(20, 9) DEFAULT 0,
          last_claim_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT false,
          farming_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_uni_farming_user_id ON uni_farming_data(user_id);
        CREATE INDEX idx_uni_farming_active ON uni_farming_data(is_active);
      `
    });
    
    if (uniError) {
      console.error('Error creating uni_farming_data:', uniError);
    } else {
      console.log('✅ uni_farming_data table created successfully');
    }
    
    // 2. Создаем таблицу ton_farming_data
    console.log('\n2. Creating ton_farming_data table...');
    const { error: tonError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS ton_farming_data (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE,
          boost_active BOOLEAN DEFAULT false,
          boost_package_id INTEGER,
          boost_expires_at TIMESTAMP WITH TIME ZONE,
          farming_balance NUMERIC(20, 9) DEFAULT 0,
          total_earned NUMERIC(20, 9) DEFAULT 0,
          last_claim_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_ton_farming_user_id ON ton_farming_data(user_id);
        CREATE INDEX idx_ton_farming_active ON ton_farming_data(boost_active);
      `
    });
    
    if (tonError) {
      console.error('Error creating ton_farming_data:', tonError);
    } else {
      console.log('✅ ton_farming_data table created successfully');
    }
    
    // 3. Настраиваем RLS
    console.log('\n3. Setting up Row Level Security...');
    
    // RLS для uni_farming_data
    await supabase.rpc('execute_sql', {
      sql_query: `
        ALTER TABLE uni_farming_data ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view their own uni farming data" ON uni_farming_data
        FOR SELECT USING (true);
        
        CREATE POLICY "Service can manage all uni farming data" ON uni_farming_data
        FOR ALL USING (true);
      `
    });
    
    // RLS для ton_farming_data
    await supabase.rpc('execute_sql', {
      sql_query: `
        ALTER TABLE ton_farming_data ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view their own ton farming data" ON ton_farming_data
        FOR SELECT USING (true);
        
        CREATE POLICY "Service can manage all ton farming data" ON ton_farming_data
        FOR ALL USING (true);
      `
    });
    
    console.log('✅ Row Level Security configured');
    
    // 4. Проверяем создание
    console.log('\n4. Verifying tables...');
    
    const { data: uniCheck } = await supabase
      .from('uni_farming_data')
      .select('*')
      .limit(1);
      
    const { data: tonCheck } = await supabase
      .from('ton_farming_data')
      .select('*')
      .limit(1);
      
    console.log('✅ uni_farming_data table exists:', uniCheck !== null);
    console.log('✅ ton_farming_data table exists:', tonCheck !== null);
    
    console.log('\n=== TABLES CREATED SUCCESSFULLY ===\n');
    console.log('Next step: Run migration script to move data');
    
  } catch (error) {
    console.error('Error in table creation:', error);
  }
}

// Альтернативный метод через direct SQL если RPC не работает
async function createTablesDirectSQL() {
  console.log('\n=== ATTEMPTING DIRECT SQL TABLE CREATION ===\n');
  
  const sqlCommands = [
    // uni_farming_data
    `CREATE TABLE IF NOT EXISTS uni_farming_data (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      deposit_amount NUMERIC(20, 9) DEFAULT 0,
      farming_balance NUMERIC(20, 9) DEFAULT 0,
      total_earned NUMERIC(20, 9) DEFAULT 0,
      last_claim_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT false,
      farming_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Indexes for uni_farming_data
    `CREATE INDEX IF NOT EXISTS idx_uni_farming_user_id ON uni_farming_data(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_uni_farming_active ON uni_farming_data(is_active)`,
    
    // ton_farming_data
    `CREATE TABLE IF NOT EXISTS ton_farming_data (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      boost_active BOOLEAN DEFAULT false,
      boost_package_id INTEGER,
      boost_expires_at TIMESTAMP WITH TIME ZONE,
      farming_balance NUMERIC(20, 9) DEFAULT 0,
      total_earned NUMERIC(20, 9) DEFAULT 0,
      last_claim_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Indexes for ton_farming_data
    `CREATE INDEX IF NOT EXISTS idx_ton_farming_user_id ON ton_farming_data(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ton_farming_active ON ton_farming_data(boost_active)`
  ];
  
  console.log('Copy and paste these SQL commands into Supabase SQL editor:\n');
  console.log('https://app.supabase.com/project/wunnsvicbebssrjqedor/sql/new\n');
  
  sqlCommands.forEach((sql, index) => {
    console.log(`-- Command ${index + 1}`);
    console.log(sql + ';');
    console.log('');
  });
}

// Пробуем сначала через RPC, если не работает - показываем SQL
createFarmingTables().catch(error => {
  console.error('RPC method failed:', error);
  createTablesDirectSQL();
});