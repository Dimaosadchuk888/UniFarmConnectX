import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

async function checkAndCreateTables() {
  try {
    logger.info('[CheckTables] Checking existing tables...');

    // Проверяем существование таблицы uni_farming_data
    const { data: uniTableExists, error: uniError } = await supabase
      .from('uni_farming_data')
      .select('user_id')
      .limit(1);

    if (uniError?.code === 'PGRST204') {
      logger.info('[CheckTables] Table uni_farming_data does not exist');
      // Таблица не существует, нужно создать
      console.log('Table uni_farming_data needs to be created');
    } else if (uniError) {
      logger.error('[CheckTables] Error checking uni_farming_data:', uniError);
    } else {
      logger.info('[CheckTables] Table uni_farming_data already exists');
      const { count } = await supabase
        .from('uni_farming_data')
        .select('*', { count: 'exact', head: true });
      console.log(`Table uni_farming_data exists with ${count} records`);
    }

    // Проверяем существование таблицы ton_farming_data
    const { data: tonTableExists, error: tonError } = await supabase
      .from('ton_farming_data')
      .select('user_id')
      .limit(1);

    if (tonError?.code === 'PGRST204') {
      logger.info('[CheckTables] Table ton_farming_data does not exist');
      // Таблица не существует, нужно создать
      console.log('Table ton_farming_data needs to be created');
    } else if (tonError) {
      logger.error('[CheckTables] Error checking ton_farming_data:', tonError);
    } else {
      logger.info('[CheckTables] Table ton_farming_data already exists');
      const { count } = await supabase
        .from('ton_farming_data')
        .select('*', { count: 'exact', head: true });
      console.log(`Table ton_farming_data exists with ${count} records`);
    }

    // Проверяем наличие пользователей с farming данными
    const { data: usersWithFarming, error: usersError } = await supabase
      .from('users')
      .select('id, uni_farming_active, uni_deposit_amount, ton_boost_active')
      .or('uni_farming_active.eq.true,uni_deposit_amount.gt.0,ton_boost_active.eq.true')
      .limit(10);

    if (usersError) {
      logger.error('[CheckTables] Error checking users with farming:', usersError);
    } else {
      console.log(`Found ${usersWithFarming?.length || 0} users with farming data to migrate`);
      if (usersWithFarming && usersWithFarming.length > 0) {
        console.log('Sample users:', usersWithFarming.slice(0, 5));
      }
    }

    console.log('\n[CheckTables] Check completed!');
    console.log('Next steps:');
    console.log('1. Create missing tables using Supabase SQL editor');
    console.log('2. Run migration script to move data');
    console.log('3. Update all modules to use new repositories');

  } catch (error) {
    logger.error('[CheckTables] Fatal error:', error);
    console.error('[CheckTables] Fatal error:', error);
    process.exit(1);
  }
}

// Запускаем проверку
checkAndCreateTables();