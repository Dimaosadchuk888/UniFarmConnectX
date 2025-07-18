/**
 * Исправление обновления временных меток UNI farming
 */

import { supabase } from '../core/supabase';

async function fixUniFarmingTimestamps() {
  console.log('\n' + '='.repeat(80));
  console.log('ИСПРАВЛЕНИЕ ВРЕМЕННЫХ МЕТОК UNI FARMING');
  console.log('='.repeat(80) + '\n');
  
  try {
    const referralIds = [186, 187, 188, 189, 190];
    const now = new Date().toISOString();
    
    // 1. Обновляем временные метки в таблице uni_farming_data
    console.log('1. Обновление временных меток в uni_farming_data...');
    
    const { error: updateError } = await supabase
      .from('uni_farming_data')
      .update({
        farming_last_update: now,
        updated_at: now
      })
      .in('user_id', referralIds);
    
    if (updateError) {
      console.error('❌ Ошибка обновления uni_farming_data:', updateError);
    } else {
      console.log('✅ Временные метки в uni_farming_data обновлены');
    }
    
    // 2. Синхронизируем с таблицей users
    console.log('\n2. Синхронизация с таблицей users...');
    
    const { error: syncError } = await supabase
      .from('users')
      .update({
        uni_farming_last_update: now
      })
      .in('id', referralIds);
    
    if (syncError) {
      console.error('❌ Ошибка синхронизации с users:', syncError);
    } else {
      console.log('✅ Временные метки в users синхронизированы');
    }
    
    // 3. Проверяем результат
    console.log('\n3. Проверка результата...\n');
    
    const { data: checkData } = await supabase
      .from('uni_farming_data')
      .select('user_id, farming_last_update')
      .in('user_id', referralIds)
      .order('user_id');
    
    checkData?.forEach(record => {
      const lastUpdate = record.farming_last_update ? new Date(record.farming_last_update) : null;
      const secondsAgo = lastUpdate ? Math.floor((Date.now() - lastUpdate.getTime()) / 1000) : 999999;
      
      if (secondsAgo < 60) {
        console.log(`✅ User ${record.user_id}: обновлен ${secondsAgo} секунд назад`);
      } else {
        console.log(`❌ User ${record.user_id}: НЕ обновлен (${secondsAgo} секунд назад)`);
      }
    });
    
    console.log('\n' + '-'.repeat(80));
    console.log('РЕКОМЕНДАЦИЯ:');
    console.log('Временные метки обновлены вручную. Теперь планировщик должен');
    console.log('начать обрабатывать рефералов и создавать UNI farming транзакции.');
    console.log('\nЗапустите планировщик снова через 5 минут для проверки.');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
  
  process.exit(0);
}

fixUniFarmingTimestamps();