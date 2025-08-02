import { supabase } from '../core/supabase.js';

async function fixTonBoostTypes() {
  console.log('🔧 ИСПРАВЛЕНИЕ ТИПОВ ДАННЫХ TON_BOOST ПОЛЕЙ');
  console.log('='.repeat(60));
  
  // Получаем всех пользователей с ton_boost_package_id как строкой
  const { data: users, error } = await supabase
    .from('users')
    .select('id, ton_boost_package, ton_boost_package_id');
  
  if (error) {
    console.error('Ошибка получения данных:', error);
    return;
  }
  
  console.log(`\n📊 Найдено пользователей для обработки: ${users?.length || 0}`);
  
  let fixed = 0;
  let errors = 0;
  
  for (const user of users || []) {
    // Приводим оба значения к числу
    const packageValue = Number(user.ton_boost_package || 0);
    const packageIdValue = Number(user.ton_boost_package_id || 0);
    
    // Берем максимальное значение (на случай если одно из них не 0)
    const finalValue = Math.max(packageValue, packageIdValue);
    
    // Обновляем оба поля числовым значением
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        ton_boost_package: finalValue,
        ton_boost_package_id: finalValue 
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.error(`❌ User ${user.id}: ошибка обновления:`, updateError);
      errors++;
    } else {
      fixed++;
      if (fixed % 20 === 0) {
        console.log(`✅ Обработано ${fixed} пользователей...`);
      }
    }
  }
  
  console.log(`\n✅ Исправлено записей: ${fixed}`);
  console.log(`❌ Ошибок: ${errors}`);
  
  // Финальная проверка
  console.log('\n🔍 Финальная проверка...');
  
  const { data: checkUsers } = await supabase
    .from('users')
    .select('id, ton_boost_package, ton_boost_package_id');
  
  let stillDifferent = 0;
  checkUsers?.forEach(user => {
    if (user.ton_boost_package !== user.ton_boost_package_id) {
      stillDifferent++;
    }
  });
  
  console.log(`\n📊 РЕЗУЛЬТАТ:`);
  console.log(`  - Всего пользователей: ${checkUsers?.length || 0}`);
  console.log(`  - Различий в ton_boost полях: ${stillDifferent}`);
  
  if (stillDifferent === 0) {
    console.log('\n✅ ВСЕ TON_BOOST ПОЛЯ УСПЕШНО СИНХРОНИЗИРОВАНЫ!');
  } else {
    console.log('\n⚠️ Остались несинхронизированные записи');
  }
}

fixTonBoostTypes().catch(console.error);