import { supabase } from './core/supabase';

async function testTonSync() {
  console.log('=== ТЕСТ СИНХРОНИЗАЦИИ TON ДАННЫХ ===\n');
  
  const userId = 74;
  
  // Проверяем текущее состояние
  const { data: before } = await supabase
    .from('ton_farming_data')
    .select('boost_active, boost_package_id, farming_rate')
    .eq('user_id', userId)
    .single();
    
  const { data: userBefore } = await supabase
    .from('users')
    .select('ton_boost_active, ton_boost_package, ton_farming_rate')
    .eq('id', userId)
    .single();
    
  console.log('До обновления:');
  console.log('ton_farming_data:', before);
  console.log('users:', userBefore);
  
  // Обновляем farming_rate в ton_farming_data
  console.log('\nОбновляю farming_rate в ton_farming_data...');
  const { error } = await supabase
    .from('ton_farming_data')
    .update({
      farming_rate: '0.02', // Увеличиваем ставку для теста
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
    
  if (error) {
    console.error('Ошибка обновления:', error);
    return;
  }
  
  // Ждем немного для синхронизации
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Проверяем результат
  const { data: after } = await supabase
    .from('ton_farming_data')
    .select('boost_active, boost_package_id, farming_rate')
    .eq('user_id', userId)
    .single();
    
  const { data: userAfter } = await supabase
    .from('users')
    .select('ton_boost_active, ton_boost_package, ton_farming_rate')
    .eq('id', userId)
    .single();
    
  console.log('\nПосле обновления:');
  console.log('ton_farming_data:', after);
  console.log('users:', userAfter);
  
  console.log('\n✅ Статус синхронизации:');
  console.log(`boost_active синхронизирован: ${after?.boost_active === userAfter?.ton_boost_active}`);
  console.log(`farming_rate синхронизирован: ${after?.farming_rate === userAfter?.ton_farming_rate}`);
}

testTonSync().catch(console.error);