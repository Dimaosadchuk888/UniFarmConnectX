const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Создаем клиент Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testRegistrationFlow() {
  console.log('=== ТЕСТ ПРОЦЕССА РЕГИСТРАЦИИ ===');
  
  // 1. Проверим последние 3 пользователя
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, telegram_id, username, referred_by, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (usersError) {
    console.error('Ошибка получения пользователей:', usersError);
    return;
  }
  
  console.log('\n=== ПОСЛЕДНИЕ 3 ПОЛЬЗОВАТЕЛЯ ===');
  users.forEach(user => {
    console.log(`User ${user.id}: TG ${user.telegram_id} (${user.username})`);
    console.log(`  referred_by: ${user.referred_by}`);
    console.log(`  created: ${user.created_at}`);
    console.log('');
  });
  
  // 2. Проверим есть ли записи в referrals
  const { data: referrals, error: referralsError } = await supabase
    .from('referrals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (referralsError) {
    console.error('Ошибка получения referrals:', referralsError);
    return;
  }
  
  console.log('\n=== ЗАПИСИ В REFERRALS ===');
  console.log(`Всего записей: ${referrals.length}`);
  if (referrals.length > 0) {
    referrals.forEach(ref => {
      console.log(`User ${ref.user_id} -> Inviter ${ref.inviter_id}, Level ${ref.level}`);
      console.log(`  Created: ${ref.created_at}`);
    });
  } else {
    console.log('🚨 ПРОБЛЕМА: Нет записей в таблице referrals!');
  }
  
  // 3. Проверим User 184 (основного реферера)
  const { data: user184, error: user184Error } = await supabase
    .from('users')
    .select('id, telegram_id, username, ref_code, referred_by, created_at')
    .eq('id', 184)
    .single();
  
  if (user184Error) {
    console.error('Ошибка получения User 184:', user184Error);
    return;
  }
  
  console.log('\n=== ДАННЫЕ USER 184 (ОСНОВНОЙ РЕФЕРЕР) ===');
  console.log(`User 184: TG ${user184.telegram_id} (${user184.username})`);
  console.log(`Ref code: ${user184.ref_code}`);
  console.log(`Referred by: ${user184.referred_by}`);
  console.log(`Created: ${user184.created_at}`);
  
  // 4. Проверим всех кто должен быть рефералами User 184
  const { data: shouldBeReferrals, error: shouldBeError } = await supabase
    .from('users')
    .select('id, telegram_id, username, referred_by, created_at')
    .eq('referred_by', 184)
    .order('created_at', { ascending: false });
  
  if (shouldBeError) {
    console.error('Ошибка поиска рефералов User 184:', shouldBeError);
    return;
  }
  
  console.log('\n=== РЕФЕРАЛЫ USER 184 В ТАБЛИЦЕ USERS ===');
  console.log(`Всего рефералов: ${shouldBeReferrals.length}`);
  if (shouldBeReferrals.length > 0) {
    shouldBeReferrals.forEach(user => {
      console.log(`User ${user.id}: TG ${user.telegram_id} (${user.username})`);
      console.log(`  Created: ${user.created_at}`);
    });
  } else {
    console.log('🚨 ПРОБЛЕМА: Нет рефералов в таблице users!');
  }
  
  // 5. Проверим записи в referrals для User 184
  const { data: referralsFor184, error: ref184Error } = await supabase
    .from('referrals')
    .select('*')
    .eq('inviter_id', 184)
    .order('created_at', { ascending: false });
  
  if (ref184Error) {
    console.error('Ошибка поиска referrals для User 184:', ref184Error);
    return;
  }
  
  console.log('\n=== ЗАПИСИ В REFERRALS ДЛЯ USER 184 ===');
  console.log(`Всего записей: ${referralsFor184.length}`);
  if (referralsFor184.length > 0) {
    referralsFor184.forEach(ref => {
      console.log(`User ${ref.user_id} -> Inviter ${ref.inviter_id}, Level ${ref.level}`);
      console.log(`  Created: ${ref.created_at}`);
    });
  } else {
    console.log('🚨 ПРОБЛЕМА: Нет записей в referrals для User 184!');
  }
  
  console.log('\n=== ВЫВОДЫ ===');
  console.log('1. Проверить работу processReferral() в auth/service.ts');
  console.log('2. Проверить логи при регистрации нового пользователя');
  console.log('3. Проверить вызов processReferral() после создания пользователя');
  console.log('4. Проверить работу таблицы referrals');
  
  process.exit(0);
}

testRegistrationFlow().catch(console.error);