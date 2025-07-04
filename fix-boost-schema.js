/**
 * Проверка и исправление схемы boost_purchases
 */

import { createClient } from '@supabase/supabase-js';

async function fixBoostSchema() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('=== ИСПРАВЛЕНИЕ СХЕМЫ boost_purchases ===');
  
  // Попробуем разные варианты названий полей
  const fieldVariants = [
    { user_id: 48, boost_id: 2, amount: '5' },
    { user_id: 48, package_id: 2, amount: '5' },
    { user_id: 48, boost_package_id: 2, amount: '5' },
    { user_id: 48, package_type: 2, amount: '5' }
  ];
  
  for (let i = 0; i < fieldVariants.length; i++) {
    const variant = fieldVariants[i];
    console.log(`\n${i + 1}. ТЕСТ ВАРИАНТА:`, Object.keys(variant));
    
    const { data, error } = await supabase
      .from('boost_purchases')
      .insert({
        ...variant,
        status: 'test',
        payment_method: 'test',
        created_at: new Date().toISOString()
      })
      .select();
    
    if (error) {
      console.log('   ❌ Ошибка:', error.message);
    } else {
      console.log('   ✅ УСПЕХ! Правильная схема:', Object.keys(variant));
      
      // Удаляем тестовую запись
      if (data && data.length > 0) {
        await supabase.from('boost_purchases').delete().eq('id', data[0].id);
        console.log('   Тестовая запись удалена');
      }
      break;
    }
  }
  
  console.log('\n=== ИСПРАВЛЕНИЕ ЗАВЕРШЕНО ===');
}

fixBoostSchema().catch(console.error);