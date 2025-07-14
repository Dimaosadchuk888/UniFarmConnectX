/**
 * Phase 3.3: Очистка накоплений - сброс времени последнего обновления
 * Запускает планировщик с чистого листа
 */

import { supabase } from '../core/supabase';

async function resetFarmingTimestamps() {
  console.log('=== PHASE 3.3: RESET FARMING TIMESTAMPS ===\n');
  
  // 1. Получить всех активных фармеров
  const { data: farmers, error: fetchError } = await supabase
    .from('users')
    .select('id, telegram_id, username, uni_farming_last_update')
    .eq('uni_farming_active', true)
    .order('id');
    
  if (fetchError) {
    console.error('Error fetching farmers:', fetchError);
    return;
  }
  
  console.log(`Found ${farmers?.length || 0} active farmers to reset\n`);
  
  if (!farmers || farmers.length === 0) {
    console.log('No active farmers found.');
    return;
  }
  
  // 2. Сбросить uni_farming_last_update на текущее время
  const currentTime = new Date().toISOString();
  let resetCount = 0;
  let errorCount = 0;
  
  console.log(`Setting all uni_farming_last_update to: ${currentTime}\n`);
  
  // Batch update всех пользователей
  const { error: updateError } = await supabase
    .from('users')
    .update({ uni_farming_last_update: currentTime })
    .eq('uni_farming_active', true);
    
  if (updateError) {
    console.error('Error batch updating timestamps:', updateError);
    return;
  }
  
  console.log('✅ All timestamps reset successfully!\n');
  
  // 3. Проверить результаты
  console.log('Verifying reset...');
  
  const { data: verifyData, error: verifyError } = await supabase
    .from('users')
    .select('id, uni_farming_last_update')
    .eq('uni_farming_active', true)
    .limit(5);
    
  if (!verifyError && verifyData) {
    console.log('\nSample of reset timestamps (first 5):');
    for (const user of verifyData) {
      console.log(`  User ${user.id}: ${user.uni_farming_last_update}`);
    }
  }
  
  // 4. Создать summary
  console.log('\n=== PHASE 3.3 SUMMARY ===');
  console.log(`Total active farmers: ${farmers.length}`);
  console.log(`Timestamps reset: ${farmers.length}`);
  console.log(`New timestamp: ${currentTime}`);
  console.log('\nNext scheduler run will start fresh without accumulated periods!');
  console.log('\n✅ Phase 3.3 complete!');
}

// Запуск сброса
resetFarmingTimestamps().catch(console.error);