/**
 * Миграция рефералов в таблицу uni_farming_data
 */

import { supabase } from '../core/supabase';

async function migrateReferralsToUniFarming() {
  console.log('\n' + '='.repeat(80));
  console.log('МИГРАЦИЯ РЕФЕРАЛОВ В UNI_FARMING_DATA');
  console.log('='.repeat(80) + '\n');
  
  try {
    const referralIds = [186, 187, 188, 189, 190];
    
    // Получаем данные рефералов из таблицы users
    const { data: referrals, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .in('id', referralIds)
      .eq('uni_farming_active', true);
    
    if (fetchError) {
      console.error('Ошибка получения рефералов:', fetchError);
      return;
    }
    
    console.log(`Найдено активных рефералов для миграции: ${referrals?.length || 0}\n`);
    
    if (!referrals || referrals.length === 0) {
      console.log('❌ Нет рефералов для миграции');
      return;
    }
    
    // Мигрируем каждого реферала
    for (const user of referrals) {
      console.log(`Миграция User ${user.id} (${user.username})...`);
      
      // Проверяем, существует ли уже запись
      const { data: existing } = await supabase
        .from('uni_farming_data')
        .select('user_id')
        .eq('user_id', user.id)
        .single();
      
      if (existing) {
        console.log(`  - Запись уже существует, обновляем...`);
        
        // Обновляем существующую запись
        const { error: updateError } = await supabase
          .from('uni_farming_data')
          .update({
            deposit_amount: user.uni_deposit_amount || '0',
            farming_balance: user.uni_farming_balance || '0',
            farming_rate: user.uni_farming_rate || '0.01',
            farming_start_timestamp: user.uni_farming_start_timestamp || new Date().toISOString(),
            farming_last_update: user.uni_farming_last_update || new Date().toISOString(),
            farming_deposit: user.uni_deposit_amount || '0',
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        
        if (updateError) {
          console.error(`  ❌ Ошибка обновления:`, updateError.message);
        } else {
          console.log(`  ✅ Запись обновлена`);
        }
      } else {
        console.log(`  - Создаем новую запись...`);
        
        // Создаем новую запись
        const { error: insertError } = await supabase
          .from('uni_farming_data')
          .insert({
            user_id: user.id,
            deposit_amount: user.uni_deposit_amount || '0',
            farming_balance: user.uni_farming_balance || '0',
            farming_rate: user.uni_farming_rate || '0.01',
            farming_start_timestamp: user.uni_farming_start_timestamp || new Date().toISOString(),
            farming_last_update: user.uni_farming_last_update || new Date().toISOString(),
            farming_deposit: user.uni_deposit_amount || '0',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`  ❌ Ошибка создания:`, insertError.message);
        } else {
          console.log(`  ✅ Запись создана`);
        }
      }
      
      console.log(`  - Депозит: ${user.uni_deposit_amount || 0} UNI`);
      console.log(`  - Ставка: ${user.uni_farming_rate || 0.01}`);
      console.log('');
    }
    
    // Проверяем результат
    console.log('-'.repeat(80));
    console.log('ПРОВЕРКА РЕЗУЛЬТАТА:\n');
    
    const { data: migrated, error: checkError } = await supabase
      .from('uni_farming_data')
      .select('*')
      .in('user_id', referralIds)
      .order('user_id');
    
    if (checkError) {
      console.error('Ошибка проверки:', checkError);
      return;
    }
    
    console.log(`Найдено рефералов в uni_farming_data: ${migrated?.length || 0}`);
    
    migrated?.forEach(record => {
      console.log(`  - User ${record.user_id}: deposit ${record.deposit_amount} UNI, active: ${record.is_active}`);
    });
    
    if (migrated?.length === referralIds.length) {
      console.log('\n✅ ВСЕ РЕФЕРАЛЫ УСПЕШНО МИГРИРОВАНЫ!');
      console.log('Теперь планировщик будет их обрабатывать.');
    } else {
      console.log(`\n⚠️  Мигрировано ${migrated?.length} из ${referralIds.length} рефералов`);
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
  
  process.exit(0);
}

migrateReferralsToUniFarming();