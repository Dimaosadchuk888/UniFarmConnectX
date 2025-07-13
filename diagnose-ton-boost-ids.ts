/**
 * Диагностика проблемы с несовпадением ID пользователей между таблицами
 */

import { supabase } from './core/supabase';

async function diagnoseIds() {
  console.log('=== Диагностика ID пользователей ===\n');
  
  // Получаем активных TON Boost пользователей
  const { data: tonUsers, error: tonError } = await supabase
    .from('ton_farming_data')
    .select('user_id, boost_package_id, farming_balance, farming_rate')
    .not('boost_package_id', 'is', null)
    .order('user_id');
    
  if (tonError) {
    console.error('Ошибка получения ton_farming_data:', tonError);
    return;
  }
  
  console.log('TON Farming пользователи:');
  console.log('ID пользователей:', tonUsers?.map(u => u.user_id).join(', '));
  console.log('');
  
  // Получаем балансы из таблицы users для тех же ID
  const userIds = tonUsers?.map(u => u.user_id) || [];
  const { data: userBalances, error: userError } = await supabase
    .from('users')
    .select('id, telegram_id, balance_ton, balance_uni')
    .in('id', userIds);
    
  if (userError) {
    console.error('Ошибка получения users:', userError);
    return;
  }
  
  console.log('Найденные пользователи в таблице users:');
  console.log('ID пользователей:', userBalances?.map(u => u.id).join(', '));
  console.log('');
  
  // Проверяем первых 10 пользователей из users
  const { data: firstUsers, error: firstError } = await supabase
    .from('users')
    .select('id, telegram_id, balance_ton, balance_uni')
    .order('id')
    .limit(10);
    
  if (!firstError && firstUsers) {
    console.log('Первые 10 пользователей в таблице users:');
    firstUsers.forEach(u => {
      console.log(`  ID: ${u.id}, telegram_id: ${u.telegram_id}, TON: ${u.balance_ton}, UNI: ${u.balance_uni}`);
    });
  }
  
  // Проверяем детально несоответствия
  console.log('\n=== Анализ несоответствий ===\n');
  
  if (tonUsers && tonUsers.length > 0) {
    for (const tonUser of tonUsers.slice(0, 3)) {
      const found = userBalances?.find(u => u.id === tonUser.user_id);
      if (!found) {
        console.log(`❌ Пользователь ${tonUser.user_id} есть в ton_farming_data, но НЕТ в users`);
        
        // Пробуем найти по другим критериям
        const { data: searchUser } = await supabase
          .from('users')
          .select('id, telegram_id')
          .eq('id', tonUser.user_id)
          .single();
          
        if (searchUser) {
          console.log(`   Но НАЙДЕН при прямом поиске: ${JSON.stringify(searchUser)}`);
        } else {
          console.log(`   НЕ найден даже при прямом поиске`);
        }
      } else {
        console.log(`✅ Пользователь ${tonUser.user_id} найден в обеих таблицах`);
      }
    }
  }
  
  // Проверяем структуру данных ton_farming_data
  console.log('\n=== Проверка структуры ton_farming_data ===\n');
  const { data: sampleTon } = await supabase
    .from('ton_farming_data')
    .select('*')
    .limit(1)
    .single();
    
  if (sampleTon) {
    console.log('Пример записи:', JSON.stringify(sampleTon, null, 2));
  }
}

diagnoseIds()
  .then(() => {
    console.log('\n✅ Диагностика завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Ошибка:', error);
    process.exit(1);
  });