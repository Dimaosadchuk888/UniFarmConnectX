/**
 * Исправление статуса boost_active для активных TON фармеров
 */

import { supabase } from '../core/supabase';

async function fixBoostActiveStatus() {
  console.log('\n' + '='.repeat(80));
  console.log('ИСПРАВЛЕНИЕ СТАТУСА boost_active ДЛЯ АКТИВНЫХ ФАРМЕРОВ');
  console.log('='.repeat(80) + '\n');
  
  try {
    // Получаем все записи с farming_balance > 0 и boost_package_id > 0
    const { data: inactiveFarmers, error: fetchError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .gt('farming_balance', 0)
      .gt('boost_package_id', 0)
      .eq('boost_active', false);
    
    if (fetchError) {
      console.error('Ошибка получения данных:', fetchError);
      return;
    }
    
    console.log(`Найдено ${inactiveFarmers?.length || 0} неактивных фармеров с депозитами:\n`);
    
    if (inactiveFarmers && inactiveFarmers.length > 0) {
      console.log('Фармеры для активации:');
      inactiveFarmers.forEach(farmer => {
        console.log(`  - User ${farmer.user_id}: ${farmer.farming_balance} TON, package #${farmer.boost_package_id}`);
      });
      
      console.log('\nОбновляем boost_active = TRUE...');
      
      // Обновляем boost_active для всех найденных записей
      const { data: updateResult, error: updateError } = await supabase
        .from('ton_farming_data')
        .update({ 
          boost_active: true,
          farming_last_update: new Date().toISOString()
        })
        .gt('farming_balance', 0)
        .gt('boost_package_id', 0)
        .eq('boost_active', false)
        .select();
      
      if (updateError) {
        console.error('❌ Ошибка обновления:', updateError);
        return;
      }
      
      console.log(`\n✅ Успешно обновлено ${updateResult?.length || 0} записей!`);
      
      // Проверяем результат
      console.log('\nПроверка обновленных записей:');
      updateResult?.forEach(record => {
        console.log(`  - User ${record.user_id}: boost_active = ${record.boost_active}`);
      });
      
      // Дополнительная проверка - получаем активных пользователей
      const { data: activeUsers, count } = await supabase
        .from('ton_farming_data')
        .select('*', { count: 'exact' })
        .eq('boost_active', true)
        .gt('farming_balance', 0);
      
      console.log(`\n📊 Итого активных TON фармеров: ${count || 0}`);
      
      if (activeUsers && activeUsers.length > 0) {
        console.log('\n🎯 Теперь планировщик должен найти этих пользователей:');
        activeUsers.forEach(user => {
          console.log(`  - User ${user.user_id}: ${user.farming_balance} TON`);
        });
      }
      
    } else {
      console.log('Нет фармеров для активации.');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('ИСПРАВЛЕНИЕ ЗАВЕРШЕНО');
  console.log('='.repeat(80) + '\n');
  
  process.exit(0);
}

fixBoostActiveStatus();