import { supabase } from './core/supabase';

async function syncTonData() {
  console.log('=== СИНХРОНИЗАЦИЯ TON ДАННЫХ ===\n');
  
  const userId = 74;
  
  // 1. Получаем текущие данные из обеих таблиц
  console.log('1. Получаю текущие данные:');
  
  const { data: userData } = await supabase
    .from('users')
    .select('ton_boost_package, ton_boost_active, ton_boost_rate, ton_farming_balance, ton_farming_rate')
    .eq('id', userId)
    .single();
    
  const { data: tonData } = await supabase
    .from('ton_farming_data')
    .select('boost_package_id, boost_active, farming_rate, farming_balance')
    .eq('user_id', userId)
    .single();
    
  console.log('\nДанные из users:');
  console.log(`  - ton_boost_package: ${userData?.ton_boost_package}`);
  console.log(`  - ton_boost_active: ${userData?.ton_boost_active}`);
  console.log(`  - ton_boost_rate: ${userData?.ton_boost_rate}`);
  
  console.log('\nДанные из ton_farming_data:');
  console.log(`  - boost_package_id: ${tonData?.boost_package_id}`);
  console.log(`  - boost_active: ${tonData?.boost_active}`);
  console.log(`  - farming_rate: ${tonData?.farming_rate}`);
  
  // 2. Синхронизируем данные
  console.log('\n2. Синхронизирую данные...');
  
  // Активируем boost в ton_farming_data если есть пакет
  if (userData?.ton_boost_package && !tonData?.boost_active) {
    const { error } = await supabase
      .from('ton_farming_data')
      .update({
        boost_active: true,
        boost_package_id: userData.ton_boost_package,
        farming_rate: userData.ton_boost_rate || '0.015',
        farming_start_timestamp: new Date().toISOString(),
        farming_last_update: new Date().toISOString()
      })
      .eq('user_id', userId);
      
    if (!error) {
      console.log('✅ Активирован boost в ton_farming_data');
    } else {
      console.log('❌ Ошибка активации boost:', error);
    }
  }
  
  // Синхронизируем обратно в users
  if (tonData?.boost_package_id) {
    const { error } = await supabase
      .from('users')
      .update({
        ton_boost_active: true,
        ton_farming_rate: tonData.farming_rate
      })
      .eq('id', userId);
      
    if (!error) {
      console.log('✅ Синхронизированы данные в users');
    } else {
      console.log('❌ Ошибка синхронизации в users:', error);
    }
  }
  
  // 3. Проверяем результат
  console.log('\n3. Проверка результата:');
  
  const { data: newUserData } = await supabase
    .from('users')
    .select('ton_boost_active, ton_farming_rate')
    .eq('id', userId)
    .single();
    
  const { data: newTonData } = await supabase
    .from('ton_farming_data')
    .select('boost_active, farming_rate')
    .eq('user_id', userId)
    .single();
    
  console.log(`\nПосле синхронизации:`);
  console.log(`users.ton_boost_active: ${newUserData?.ton_boost_active}`);
  console.log(`ton_farming_data.boost_active: ${newTonData?.boost_active}`);
  
  if (newUserData?.ton_boost_active === newTonData?.boost_active) {
    console.log('\n✅ Данные успешно синхронизированы!');
  } else {
    console.log('\n⚠️ Данные все еще не синхронизированы');
  }
}

syncTonData().catch(console.error);