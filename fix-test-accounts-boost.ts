import { supabase } from './core/supabaseClient';

async function fixTestAccountsBoost() {
  console.log('=== ИСПРАВЛЕНИЕ ТЕСТОВЫХ АККАУНТОВ 311-313 ===\n');
  
  const REFERRER_ID = 184;
  const testUserIds = [311, 312, 313];
  
  // 1. Проверяем структуру таблицы referrals
  console.log('1. Проверка структуры referrals:');
  const { data: sampleRef } = await supabase
    .from('referrals')
    .select('*')
    .limit(1);
    
  if (sampleRef && sampleRef.length > 0) {
    console.log('Колонки в referrals:', Object.keys(sampleRef[0]));
  }
  
  // 2. Создаем партнерские связи с правильными названиями колонок
  console.log('\n2. Создание партнерских связей:');
  for (const userId of testUserIds) {
    const { error: refError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: REFERRER_ID,
        user_id: userId, // Попробуем user_id вместо referred_id
        level: 1,
        created_at: new Date().toISOString()
      });
      
    if (!refError) {
      console.log(`✅ User ${userId} привязан как реферал к User ${REFERRER_ID}`);
    } else {
      console.log(`❌ Ошибка привязки User ${userId}: ${refError.message}`);
    }
  }
  
  // 3. Активируем boost_active в ton_farming_data
  console.log('\n3. Активация TON farming (boost_active = true):');
  for (const userId of testUserIds) {
    const { error: updateError } = await supabase
      .from('ton_farming_data')
      .update({
        boost_active: true
      })
      .eq('user_id', userId);
      
    if (!updateError) {
      console.log(`✅ User ${userId}: boost_active = true`);
    } else {
      console.log(`❌ Ошибка активации User ${userId}: ${updateError.message}`);
    }
  }
  
  // 4. Проверяем результат
  console.log('\n4. ИТОГОВАЯ ПРОВЕРКА:');
  
  // Проверяем партнерские связи
  const { data: refs } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', REFERRER_ID)
    .in('user_id', testUserIds);
    
  if (refs && refs.length > 0) {
    console.log(`\n✅ Найдено ${refs.length} партнерских связей для User ${REFERRER_ID}`);
  }
  
  // Проверяем статус farming
  const { data: farmingData } = await supabase
    .from('ton_farming_data')
    .select('user_id, boost_active, farming_balance')
    .in('user_id', testUserIds);
    
  if (farmingData) {
    console.log('\nСтатус TON farming:');
    farmingData.forEach(data => {
      console.log(`├── User ${data.user_id}: boost_active = ${data.boost_active}, balance = ${data.farming_balance} TON`);
    });
  }
  
  // Проверяем пользователей
  const { data: users } = await supabase
    .from('users')
    .select('id, username, ton_boost_package, ton_farming_balance')
    .in('id', testUserIds);
    
  if (users) {
    console.log('\nДанные пользователей:');
    users.forEach(user => {
      console.log(`├── ${user.username} (ID: ${user.id}): пакет ${user.ton_boost_package}, баланс ${user.ton_farming_balance} TON`);
    });
  }
  
  console.log('\n\n✅ ГОТОВО! Теперь эти аккаунты должны генерировать TON farming и партнерские начисления.');
}

fixTestAccountsBoost();