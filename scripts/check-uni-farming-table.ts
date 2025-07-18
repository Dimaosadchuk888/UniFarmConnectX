/**
 * Проверка существования таблицы uni_farming_data
 */

import { supabase } from '../core/supabase';

async function checkUniFarmingTable() {
  console.log('\n' + '='.repeat(80));
  console.log('ПРОВЕРКА ТАБЛИЦЫ UNI_FARMING_DATA');
  console.log('='.repeat(80) + '\n');
  
  try {
    // Пробуем получить данные из таблицы uni_farming_data
    console.log('1. Проверка существования таблицы uni_farming_data...');
    const { data, error } = await supabase
      .from('uni_farming_data')
      .select('*')
      .limit(5);
    
    if (error) {
      if (error.code === '42P01') {
        console.log('❌ Таблица uni_farming_data НЕ СУЩЕСТВУЕТ');
        console.log('Репозиторий использует fallback на таблицу users\n');
      } else {
        console.log('⚠️  Таблица существует, но есть ошибка:', error.message);
      }
    } else {
      console.log('✅ Таблица uni_farming_data СУЩЕСТВУЕТ');
      console.log(`Найдено записей: ${data?.length || 0}`);
      
      if (data && data.length > 0) {
        console.log('\nПримеры записей:');
        data.forEach(record => {
          console.log(`  - user_id: ${record.user_id}, is_active: ${record.is_active}, deposit: ${record.deposit_amount}`);
        });
      }
    }
    
    // Проверяем, какие данные возвращает getActiveFarmers
    console.log('\n2. Проверка метода getActiveFarmers()...');
    const { UniFarmingRepository } = await import('../modules/farming/UniFarmingRepository');
    const repo = new UniFarmingRepository();
    const activeFarmers = await repo.getActiveFarmers();
    
    console.log(`\ngetActiveFarmers() вернул ${activeFarmers.length} записей`);
    
    // Анализируем типы user_id
    const sampleFarmers = activeFarmers.slice(0, 5);
    console.log('\nПримеры данных:');
    sampleFarmers.forEach(farmer => {
      const idType = typeof farmer.user_id;
      console.log(`  - user_id: ${farmer.user_id} (тип: ${idType}), deposit: ${farmer.deposit_amount}`);
    });
    
    // Проверяем наличие рефералов в результатах
    const referralIds = [186, 187, 188, 189, 190];
    const foundReferrals = activeFarmers.filter(f => referralIds.includes(f.user_id));
    
    console.log(`\nНайдено рефералов в getActiveFarmers(): ${foundReferrals.length} из 5`);
    if (foundReferrals.length === 0) {
      console.log('❌ Рефералы НЕ найдены в результатах getActiveFarmers()!');
      
      // Проверяем тип проблемы
      const hasUUIDs = activeFarmers.some(f => typeof f.user_id === 'string' && f.user_id.includes('-'));
      const hasNumbers = activeFarmers.some(f => typeof f.user_id === 'number');
      
      if (hasUUIDs && !hasNumbers) {
        console.log('\nПРОБЛЕМА: Все user_id являются UUID строками');
        console.log('Планировщик не может сопоставить их с числовыми ID рефералов');
      }
    } else {
      console.log('✅ Рефералы найдены в результатах');
      foundReferrals.forEach(r => {
        console.log(`  - User ${r.user_id}: deposit ${r.deposit_amount}, last update: ${r.farming_last_update}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
  
  process.exit(0);
}

checkUniFarmingTable();