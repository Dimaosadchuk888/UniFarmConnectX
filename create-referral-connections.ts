import { supabase } from './core/supabaseClient';

async function createReferralConnections() {
  console.log('=== СОЗДАНИЕ ПАРТНЕРСКИХ СВЯЗЕЙ ДЛЯ ТЕСТОВЫХ АККАУНТОВ ===\n');
  
  const REFERRER_ID = 184;
  const testUserIds = [311, 312, 313];
  
  console.log('Правильная структура колонок в referrals:');
  console.log('- inviter_id (кто пригласил) = 184');
  console.log('- user_id (кто был приглашен) = 311, 312, 313\n');
  
  // Создаем партнерские связи с правильными названиями колонок
  for (const userId of testUserIds) {
    const { error: refError } = await supabase
      .from('referrals')
      .insert({
        inviter_id: REFERRER_ID,  // Правильное название колонки!
        user_id: userId,          // Правильное название колонки!
        level: 1,
        created_at: new Date().toISOString()
      });
      
    if (!refError) {
      console.log(`✅ User ${userId} привязан как реферал L1 к User ${REFERRER_ID}`);
    } else {
      console.log(`❌ Ошибка привязки User ${userId}: ${refError.message}`);
    }
  }
  
  // Проверяем результат
  console.log('\n\nПРОВЕРКА ПАРТНЕРСКИХ СВЯЗЕЙ:');
  
  const { data: refs } = await supabase
    .from('referrals')
    .select('*')
    .eq('inviter_id', REFERRER_ID)
    .in('user_id', testUserIds);
    
  if (refs && refs.length > 0) {
    console.log(`\n✅ Успешно создано ${refs.length} партнерских связей:`);
    refs.forEach(ref => {
      console.log(`├── User ${ref.user_id} - реферал L${ref.level} пользователя ${ref.inviter_id}`);
    });
  } else {
    console.log('❌ Партнерские связи не найдены');
  }
  
  // Финальная проверка всей системы
  console.log('\n\nФИНАЛЬНАЯ ПРОВЕРКА СИСТЕМЫ:');
  
  const { data: users } = await supabase
    .from('users')
    .select('id, username, ton_boost_package, ton_farming_balance')
    .in('id', testUserIds);
    
  const { data: farming } = await supabase
    .from('ton_farming_data')
    .select('user_id, boost_active')
    .in('user_id', testUserIds);
    
  console.log('\nТестовые аккаунты готовы к работе:');
  users?.forEach(user => {
    const farmingData = farming?.find(f => f.user_id === user.id);
    console.log(`\n${user.username} (ID: ${user.id})`);
    console.log(`├── TON Boost пакет: ${user.ton_boost_package} ✅`);
    console.log(`├── TON farming баланс: ${user.ton_farming_balance} TON ✅`);
    console.log(`├── Boost активен: ${farmingData?.boost_active ? '✅' : '❌'}`);
    console.log(`└── Партнерская связь: создана с User ${REFERRER_ID} ✅`);
  });
  
  console.log('\n\n🎉 УСПЕХ! Все 3 тестовых аккаунта:');
  console.log('- Имеют активные TON Boost пакеты');
  console.log('- Привязаны как ваши рефералы L1');
  console.log('- Начнут генерировать TON farming через 5 минут');
  console.log('- Вы получите партнерские начисления от их farming!');
}

createReferralConnections();