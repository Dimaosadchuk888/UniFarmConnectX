async function diagnoseReferrals() {
  const { supabase } = await import('./scripts/core/supabase.js');
  console.log('=== ДИАГНОСТИКА РЕФЕРАЛЬНОЙ СИСТЕМЫ ===');
  
  // 1. Проверим последние 5 пользователей
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, telegram_id, username, referred_by, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (usersError) {
    console.error('Ошибка получения пользователей:', usersError);
    return;
  }
  
  console.log('\n=== ПОСЛЕДНИЕ 5 ПОЛЬЗОВАТЕЛЕЙ ===');
  users.forEach(user => {
    console.log(`User ${user.id}: TG ${user.telegram_id} (${user.username}), referred_by: ${user.referred_by}, created: ${user.created_at}`);
  });
  
  // 2. Проверим записи в таблице referrals
  const { data: referrals, error: referralsError } = await supabase
    .from('referrals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (referralsError) {
    console.error('Ошибка получения referrals:', referralsError);
    return;
  }
  
  console.log('\n=== ЗАПИСИ В REFERRALS ===');
  console.log(`Всего записей: ${referrals.length}`);
  referrals.forEach(ref => {
    console.log(`User ${ref.user_id} -> Inviter ${ref.inviter_id}, Level ${ref.level}, Created: ${ref.created_at}`);
  });
  
  // 3. Проверим пользователей с referred_by != null
  const { data: usersWithReferrers, error: refError } = await supabase
    .from('users')
    .select('id, telegram_id, username, referred_by, created_at')
    .not('referred_by', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (refError) {
    console.error('Ошибка получения пользователей с рефералами:', refError);
    return;
  }
  
  console.log('\n=== ПОЛЬЗОВАТЕЛИ С РЕФЕРАЛАМИ ===');
  console.log(`Всего пользователей с рефералами: ${usersWithReferrers.length}`);
  usersWithReferrers.forEach(user => {
    console.log(`User ${user.id}: TG ${user.telegram_id} (${user.username}), referred_by: ${user.referred_by}, created: ${user.created_at}`);
  });
  
  // 4. Проверим User 184 (основного реферера)
  const { data: user184, error: user184Error } = await supabase
    .from('users')
    .select('id, telegram_id, username, ref_code, referred_by, created_at')
    .eq('id', 184)
    .single();
  
  if (user184Error) {
    console.error('Ошибка получения User 184:', user184Error);
    return;
  }
  
  console.log('\n=== ДАННЫЕ USER 184 ===');
  console.log(`User 184: TG ${user184.telegram_id} (${user184.username})`);
  console.log(`Ref code: ${user184.ref_code}`);
  console.log(`Referred by: ${user184.referred_by}`);
  console.log(`Created: ${user184.created_at}`);
  
  // 5. Найдем всех кто ссылается на User 184
  const { data: referredByUser184, error: ref184Error } = await supabase
    .from('users')
    .select('id, telegram_id, username, referred_by, created_at')
    .eq('referred_by', 184)
    .order('created_at', { ascending: false });
  
  if (ref184Error) {
    console.error('Ошибка поиска рефералов User 184:', ref184Error);
    return;
  }
  
  console.log('\n=== РЕФЕРАЛЫ USER 184 ===');
  console.log(`Всего рефералов: ${referredByUser184.length}`);
  referredByUser184.forEach(user => {
    console.log(`User ${user.id}: TG ${user.telegram_id} (${user.username}), created: ${user.created_at}`);
  });
  
  process.exit(0);
}

diagnoseReferrals().catch(console.error);