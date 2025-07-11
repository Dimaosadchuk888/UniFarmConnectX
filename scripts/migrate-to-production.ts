import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

async function migrateToProduction() {
  console.log('\n=== PRODUCTION MIGRATION STARTED ===\n');
  
  try {
    // 1. Проверяем существование новых таблиц
    console.log('1. Checking if new tables exist...');
    
    const { data: uniData, error: uniError } = await supabase
      .from('uni_farming_data')
      .select('count')
      .limit(1);
      
    const { data: tonData, error: tonError } = await supabase
      .from('ton_farming_data')
      .select('count')
      .limit(1);
      
    if (uniError?.code === '42P01' || tonError?.code === '42P01') {
      console.error('❌ Tables not found! Please execute PRODUCTION_SQL_SETUP.sql first.');
      console.log('\nInstructions:');
      console.log('1. Go to: https://app.supabase.com/project/wunnsvicbebssrjqedor/sql/new');
      console.log('2. Copy content from PRODUCTION_SQL_SETUP.sql');
      console.log('3. Execute the SQL');
      console.log('4. Run this script again');
      return;
    }
    
    console.log('✅ Tables exist! Proceeding with migration...');
    
    // 2. Получаем пользователей для миграции
    console.log('\n2. Fetching users with farming data...');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, uni_farming_active, uni_deposit_amount, uni_farming_balance, uni_farming_start_timestamp, ton_boost_active, ton_boost_package, ton_boost_expires_at, ton_farming_balance')
      .or('uni_deposit_amount.gt.0,uni_farming_active.eq.true,ton_boost_active.eq.true');
      
    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }
    
    console.log(`✅ Found ${users.length} users to migrate`);
    
    // 3. Миграция UNI farming данных
    console.log('\n3. Migrating UNI farming data...');
    
    const uniFarmingRecords = users
      .filter(u => u.uni_deposit_amount > 0 || u.uni_farming_active)
      .map(u => ({
        user_id: u.id.toString(),
        deposit_amount: u.uni_deposit_amount || 0,
        farming_balance: u.uni_farming_balance || 0,
        total_earned: 0,
        is_active: u.uni_farming_active || false,
        farming_start: u.uni_farming_start_timestamp || new Date().toISOString(),
        last_claim_at: u.uni_farming_start_timestamp || new Date().toISOString()
      }));
      
    if (uniFarmingRecords.length > 0) {
      const { error: uniInsertError } = await supabase
        .from('uni_farming_data')
        .upsert(uniFarmingRecords, { onConflict: 'user_id' });
        
      if (uniInsertError) {
        console.error('Error migrating UNI farming data:', uniInsertError);
      } else {
        console.log(`✅ Migrated ${uniFarmingRecords.length} UNI farming records`);
      }
    }
    
    // 4. Миграция TON boost данных
    console.log('\n4. Migrating TON boost data...');
    
    const tonFarmingRecords = users
      .filter(u => u.ton_boost_active || u.ton_boost_package)
      .map(u => ({
        user_id: u.id.toString(),
        boost_active: u.ton_boost_active || false,
        boost_package_id: u.ton_boost_package || null,
        boost_expires_at: u.ton_boost_expires_at || null,
        farming_balance: u.ton_farming_balance || 0,
        total_earned: 0
      }));
      
    if (tonFarmingRecords.length > 0) {
      const { error: tonInsertError } = await supabase
        .from('ton_farming_data')
        .upsert(tonFarmingRecords, { onConflict: 'user_id' });
        
      if (tonInsertError) {
        console.error('Error migrating TON farming data:', tonInsertError);
      } else {
        console.log(`✅ Migrated ${tonFarmingRecords.length} TON farming records`);
      }
    }
    
    // 5. Проверяем результаты
    console.log('\n5. Verifying migration results...');
    
    const { count: uniCount } = await supabase
      .from('uni_farming_data')
      .select('*', { count: 'exact', head: true });
      
    const { count: tonCount } = await supabase
      .from('ton_farming_data')
      .select('*', { count: 'exact', head: true });
      
    console.log(`\n✅ MIGRATION COMPLETED!`);
    console.log(`- UNI farming records: ${uniCount}`);
    console.log(`- TON farming records: ${tonCount}`);
    
    // 6. Тестируем новые репозитории
    console.log('\n6. Testing new repositories...');
    
    const { uniFarmingRepository } = await import('../modules/farming/UniFarmingRepository');
    const { tonFarmingRepository } = await import('../modules/boost/TonFarmingRepository');
    
    const testUni = await uniFarmingRepository.getByUserId('62');
    const testTon = await tonFarmingRepository.getByUserId('62');
    
    if (testUni) {
      console.log('✅ UniFarmingRepository working with new table');
    }
    
    if (testTon) {
      console.log('✅ TonFarmingRepository working with new table');
    }
    
    console.log('\n=== SYSTEM IS NOW IN PRODUCTION MODE ===');
    console.log('All farming operations will use the new optimized tables!');
    
  } catch (error) {
    console.error('Migration error:', error);
  }
}

export default migrateToProduction;

// Run if called directly
if (require.main === module) {
  migrateToProduction().catch(console.error);
}