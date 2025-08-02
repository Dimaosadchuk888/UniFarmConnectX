import { supabase } from '../core/supabase.js';

async function debugTonBoostSync() {
  console.log('🔍 ДЕТАЛЬНАЯ ПРОВЕРКА TON_BOOST ПОЛЕЙ');
  console.log('='.repeat(60));
  
  // Получаем несколько пользователей для анализа
  const { data: users, error } = await supabase
    .from('users')
    .select('id, ton_boost_package, ton_boost_package_id')
    .limit(10);
  
  if (error) {
    console.error('Ошибка:', error);
    return;
  }
  
  console.log('\n📊 Примеры данных (первые 10 пользователей):');
  users?.forEach(user => {
    const isDifferent = user.ton_boost_package !== user.ton_boost_package_id;
    const status = isDifferent ? '❌' : '✅';
    console.log(`${status} User ${user.id}: ton_boost_package=${user.ton_boost_package}, ton_boost_package_id=${user.ton_boost_package_id}`);
    
    if (isDifferent) {
      console.log(`   Типы: ton_boost_package=${typeof user.ton_boost_package}, ton_boost_package_id=${typeof user.ton_boost_package_id}`);
      console.log(`   Строгое сравнение: ${user.ton_boost_package === user.ton_boost_package_id}`);
      console.log(`   Нестрогое сравнение: ${user.ton_boost_package == user.ton_boost_package_id}`);
    }
  });
  
  // Проверим различия более детально
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, ton_boost_package, ton_boost_package_id');
  
  let typeIssues = 0;
  let valueIssues = 0;
  let bothNull = 0;
  let bothZero = 0;
  
  allUsers?.forEach(user => {
    if (user.ton_boost_package === null && user.ton_boost_package_id === null) {
      bothNull++;
    } else if (user.ton_boost_package === 0 && user.ton_boost_package_id === 0) {
      bothZero++;
    } else if (user.ton_boost_package == user.ton_boost_package_id && user.ton_boost_package !== user.ton_boost_package_id) {
      typeIssues++;
    } else if (user.ton_boost_package !== user.ton_boost_package_id) {
      valueIssues++;
    }
  });
  
  console.log('\n📈 АНАЛИЗ РАЗЛИЧИЙ:');
  console.log(`  - Всего пользователей: ${allUsers?.length || 0}`);
  console.log(`  - Оба поля NULL: ${bothNull}`);
  console.log(`  - Оба поля = 0: ${bothZero}`);
  console.log(`  - Проблемы с типами: ${typeIssues}`);
  console.log(`  - Реальные различия в значениях: ${valueIssues}`);
  
  // Проверим, не сравниваются ли null и 0
  const { data: nullZeroCheck } = await supabase
    .from('users')
    .select('id, ton_boost_package, ton_boost_package_id')
    .or('and(ton_boost_package.is.null,ton_boost_package_id.eq.0),and(ton_boost_package.eq.0,ton_boost_package_id.is.null)');
  
  console.log(`\n🔄 Пользователи с null/0 несоответствием: ${nullZeroCheck?.length || 0}`);
  
  if (nullZeroCheck && nullZeroCheck.length > 0) {
    console.log('Примеры:');
    nullZeroCheck.slice(0, 5).forEach(user => {
      console.log(`  User ${user.id}: ton_boost_package=${user.ton_boost_package}, ton_boost_package_id=${user.ton_boost_package_id}`);
    });
  }
}

debugTonBoostSync().catch(console.error);