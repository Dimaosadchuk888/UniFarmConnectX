const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Создаем клиент Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function comprehensiveReferralDiagnosis() {
  console.log('=== КОМПЛЕКСНАЯ ДИАГНОСТИКА РЕФЕРАЛЬНОЙ СИСТЕМЫ ===');
  console.log('Дата проверки:', new Date().toISOString());
  
  // 1. Проверяем User 184 (основной реферер)
  console.log('\n=== 1. ПРОВЕРКА USER 184 (ОСНОВНОЙ РЕФЕРЕР) ===');
  
  const { data: user184, error: user184Error } = await supabase
    .from('users')
    .select('id, telegram_id, username, ref_code, referred_by, created_at')
    .eq('id', 184)
    .single();
  
  if (user184Error) {
    console.error('❌ Ошибка получения User 184:', user184Error);
    return;
  }
  
  console.log('✅ User 184 найден:');
  console.log('  ID:', user184.id);
  console.log('  Telegram ID:', user184.telegram_id);
  console.log('  Username:', user184.username);
  console.log('  Ref Code:', user184.ref_code);
  console.log('  Referred By:', user184.referred_by);
  console.log('  Created:', user184.created_at);
  
  // 2. Проверяем всех пользователей с referred_by = 184
  console.log('\n=== 2. ПОЛЬЗОВАТЕЛИ С REFERRED_BY = 184 ===');
  
  const { data: referredUsers, error: referredError } = await supabase
    .from('users')
    .select('id, telegram_id, username, referred_by, created_at')
    .eq('referred_by', 184)
    .order('created_at', { ascending: false });
  
  if (referredError) {
    console.error('❌ Ошибка получения referred пользователей:', referredError);
    return;
  }
  
  console.log(`✅ Найдено ${referredUsers.length} пользователей с referred_by = 184:`);
  referredUsers.forEach((user, index) => {
    console.log(`  ${index + 1}. User ${user.id} (TG: ${user.telegram_id}, ${user.username})`);
    console.log(`     Created: ${user.created_at}`);
  });
  
  // 3. Проверяем записи в таблице referrals
  console.log('\n=== 3. ЗАПИСИ В ТАБЛИЦЕ REFERRALS ===');
  
  const { data: referralsData, error: referralsError } = await supabase
    .from('referrals')
    .select('*')
    .eq('inviter_id', 184)
    .order('created_at', { ascending: false });
  
  if (referralsError) {
    console.error('❌ Ошибка получения referrals:', referralsError);
    return;
  }
  
  console.log(`✅ Найдено ${referralsData.length} записей в referrals для User 184:`);
  referralsData.forEach((ref, index) => {
    console.log(`  ${index + 1}. User ${ref.user_id} -> Inviter ${ref.inviter_id}, Level ${ref.level}`);
    console.log(`     Created: ${ref.created_at}`);
  });
  
  // 4. Проверяем новых пользователей (195, 196, 197)
  console.log('\n=== 4. ПРОВЕРКА НОВЫХ ПОЛЬЗОВАТЕЛЕЙ (195, 196, 197) ===');
  
  const { data: newUsers, error: newUsersError } = await supabase
    .from('users')
    .select('id, telegram_id, username, referred_by, created_at')
    .in('id', [195, 196, 197])
    .order('id', { ascending: false });
  
  if (newUsersError) {
    console.error('❌ Ошибка получения новых пользователей:', newUsersError);
    return;
  }
  
  console.log(`✅ Найдено ${newUsers.length} новых пользователей:`);
  newUsers.forEach((user, index) => {
    console.log(`  ${index + 1}. User ${user.id} (TG: ${user.telegram_id}, ${user.username})`);
    console.log(`     Referred By: ${user.referred_by}`);
    console.log(`     Created: ${user.created_at}`);
    
    if (user.referred_by === null) {
      console.log('     ⚠️  ПРОБЛЕМА: referred_by = null');
    }
  });
  
  // 5. Проверяем логику миграции
  console.log('\n=== 5. АНАЛИЗ МИГРАЦИИ ===');
  
  const referredUserIds = referredUsers.map(u => u.id);
  const referralsUserIds = referralsData.map(r => r.user_id);
  
  console.log('Пользователи в users.referred_by:', referredUserIds.sort());
  console.log('Пользователи в referrals.user_id:', referralsUserIds.sort());
  
  const missingInReferrals = referredUserIds.filter(id => !referralsUserIds.includes(id));
  const missingInUsers = referralsUserIds.filter(id => !referredUserIds.includes(id));
  
  if (missingInReferrals.length > 0) {
    console.log('⚠️  Пользователи в users.referred_by, но НЕ в referrals:', missingInReferrals);
  }
  
  if (missingInUsers.length > 0) {
    console.log('⚠️  Пользователи в referrals, но НЕ в users.referred_by:', missingInUsers);
  }
  
  if (missingInReferrals.length === 0 && missingInUsers.length === 0) {
    console.log('✅ Миграция корректна - все пользователи синхронизированы');
  }
  
  // 6. Проверяем временные рамки
  console.log('\n=== 6. ВРЕМЕННОЙ АНАЛИЗ ===');
  
  const lastWorkingReferral = referralsData[0]?.created_at;
  const firstFailedUser = newUsers.find(u => u.referred_by === null);
  
  if (lastWorkingReferral && firstFailedUser) {
    console.log('Последняя работающая реферальная запись:', lastWorkingReferral);
    console.log('Первый пользователь с referred_by=null:', firstFailedUser.created_at);
    
    const lastWorkingTime = new Date(lastWorkingReferral);
    const firstFailedTime = new Date(firstFailedUser.created_at);
    
    console.log('Временной промежуток между работающим и сломанным:', 
                Math.round((firstFailedTime - lastWorkingTime) / (1000 * 60 * 60)), 'часов');
  }
  
  // 7. Выводы
  console.log('\n=== 7. ВЫВОДЫ ===');
  
  if (referredUsers.length > 0 && referralsData.length > 0) {
    console.log('✅ Миграция успешна - 6 пользователей правильно мигрированы');
  } else {
    console.log('❌ Миграция не найдена');
  }
  
  if (newUsers.every(u => u.referred_by === null)) {
    console.log('❌ ПРОБЛЕМА: Все новые пользователи имеют referred_by = null');
    console.log('   Это означает что processReferral() НЕ работает после миграции');
  }
  
  console.log('\n=== РЕКОМЕНДАЦИИ ===');
  console.log('1. Проверить логи сервера на предмет ошибок в processReferral()');
  console.log('2. Проверить вызывается ли processReferral() в auth/service.ts');
  console.log('3. Протестировать создание нового пользователя с реферальным кодом');
  
  process.exit(0);
}

comprehensiveReferralDiagnosis().catch(console.error);