/**
 * Проверка значений boost_active в БД
 */

import { supabase } from '../core/supabase';

async function checkBoostActiveField() {
  console.log('\n' + '='.repeat(80));
  console.log('ПРОВЕРКА ПОЛЯ boost_active В TON_FARMING_DATA');
  console.log('='.repeat(80) + '\n');
  
  try {
    // Проверяем все записи с farming_balance > 0
    const { data: allRecords, error } = await supabase
      .from('ton_farming_data')
      .select('*')
      .gt('farming_balance', 0);
    
    if (error) {
      console.error('Ошибка получения данных:', error);
      return;
    }
    
    console.log(`Найдено ${allRecords?.length || 0} записей с farming_balance > 0:\n`);
    
    allRecords?.forEach(record => {
      console.log(`User ${record.user_id}:`);
      console.log(`  - farming_balance: ${record.farming_balance} TON`);
      console.log(`  - boost_active: ${record.boost_active} (тип: ${typeof record.boost_active})`);
      console.log(`  - boost_package_id: ${record.boost_package_id}`);
      console.log('');
    });
    
    // Проверяем сколько записей с boost_active = true
    const { data: activeRecords, count: activeCount } = await supabase
      .from('ton_farming_data')
      .select('*', { count: 'exact' })
      .eq('boost_active', true)
      .gt('farming_balance', 0);
    
    console.log(`\nЗаписей с boost_active = TRUE: ${activeCount || 0}`);
    
    // Проверяем записи с boost_active = false или null
    const { data: inactiveRecords } = await supabase
      .from('ton_farming_data')
      .select('*')
      .or('boost_active.is.null,boost_active.eq.false')
      .gt('farming_balance', 0);
    
    console.log(`Записей с boost_active = FALSE или NULL: ${inactiveRecords?.length || 0}`);
    
    console.log('\n' + '-'.repeat(80));
    console.log('ВЫВОД:');
    if (activeCount === 0 && allRecords && allRecords.length > 0) {
      console.log('\n❌ ПРОБЛЕМА НАЙДЕНА!');
      console.log('Все записи имеют boost_active = NULL или FALSE');
      console.log('Планировщик ищет записи с boost_active = TRUE, поэтому не находит ни одного пользователя!');
      console.log('\nРЕШЕНИЕ:');
      console.log('Нужно обновить записи и установить boost_active = TRUE для активных фармеров');
    } else if (activeCount && activeCount > 0) {
      console.log('\n✅ Записи с boost_active = TRUE найдены');
      console.log('Проблема может быть в другом месте');
    }
    
  } catch (error) {
    console.error('Критическая ошибка:', error);
  }
  
  process.exit(0);
}

checkBoostActiveField();