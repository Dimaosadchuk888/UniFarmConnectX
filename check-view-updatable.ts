import { supabase } from './core/supabaseClient';

async function checkViewUpdatable() {
  console.log('=== ПРОВЕРКА ОБНОВЛЯЕМЫХ ПОЛЕЙ В VIEW ===\n');
  
  const userId = '184';
  
  // Проверим обновление без полей updated_at и created_at
  console.log('1. Тест UPDATE без системных полей:');
  const updateData = {
    deposit_amount: '80391',
    farming_deposit: '80391', 
    is_active: true,
    farming_last_update: new Date().toISOString()
    // НЕ включаем updated_at и created_at!
  };
  
  console.log('Данные для обновления:', updateData);
  
  const { data: updateResult, error: updateError } = await supabase
    .from('uni_farming_data')
    .update(updateData)
    .eq('user_id', parseInt(userId))
    .select();
    
  if (updateError) {
    console.log('❌ Ошибка UPDATE:', updateError.code, updateError.message);
    console.log('   Детали:', updateError.details || 'нет деталей');
  } else {
    console.log('✅ UPDATE успешен!');
    console.log('   Результат:', updateResult);
  }
  
  // Проверим INSERT без системных полей
  console.log('\n2. Тест INSERT в представление:');
  const insertData = {
    user_id: 999999, // Несуществующий ID
    deposit_amount: '100',
    farming_deposit: '100',
    is_active: true,
    farming_start_timestamp: new Date().toISOString(),
    farming_last_update: new Date().toISOString()
  };
  
  const { data: insertResult, error: insertError } = await supabase
    .from('uni_farming_data')
    .insert(insertData)
    .select();
    
  if (insertError) {
    console.log('❌ INSERT в VIEW не поддерживается:', insertError.code, insertError.message);
  } else {
    console.log('✅ INSERT поддерживается!');
  }
  
  // Удалим тестовую запись если она создалась
  if (insertResult) {
    await supabase
      .from('uni_farming_data')
      .delete()
      .eq('user_id', 999999);
  }
}

checkViewUpdatable().catch(console.error);