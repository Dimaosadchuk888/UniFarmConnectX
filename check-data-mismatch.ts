import { supabase } from './core/supabase';

async function checkDataMismatch() {
  console.log('=== ПРОВЕРКА НЕСООТВЕТСТВИЯ ДАННЫХ ===\n');

  // 1. Проверяем пользователей в ton_farming_data
  const { data: tonFarmingUsers } = await supabase
    .from('ton_farming_data')
    .select('user_id, boost_package_id, farming_balance')
    .gt('boost_package_id', 0);

  console.log('1. Пользователи в ton_farming_data с активным boost:');
  tonFarmingUsers?.forEach(u => {
    console.log(`  - User ID: ${u.user_id} (тип: ${typeof u.user_id}), пакет: ${u.boost_package_id}, баланс: ${u.farming_balance}`);
  });

  // 2. Проверяем какие из них есть в users
  if (tonFarmingUsers && tonFarmingUsers.length > 0) {
    const userIds = tonFarmingUsers.map(u => u.user_id);
    
    // Пробуем как числа
    const { data: usersAsNumbers } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton')
      .in('id', userIds.map(id => parseInt(id.toString())));

    console.log('\n2. Из них найдено в таблице users (как числа):');
    if (usersAsNumbers && usersAsNumbers.length > 0) {
      usersAsNumbers.forEach(u => {
        console.log(`  - User ${u.id} (@${u.username}), баланс TON: ${u.balance_ton}`);
      });
    } else {
      console.log('  - НЕ НАЙДЕНО');
    }

    // Пробуем как строки
    const { data: usersAsStrings } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton')
      .in('id', userIds);

    console.log('\n3. Из них найдено в таблице users (как строки):');
    if (usersAsStrings && usersAsStrings.length > 0) {
      usersAsStrings.forEach(u => {
        console.log(`  - User ${u.id} (@${u.username}), баланс TON: ${u.balance_ton}`);
      });
    } else {
      console.log('  - НЕ НАЙДЕНО');
    }
  }

  // 4. Проверяем рефералов user 184
  console.log('\n4. Рефералы user 184 с TON Boost:');
  const { data: referrals184 } = await supabase
    .from('users')
    .select('id, username')
    .eq('referred_by', 184);

  if (referrals184 && referrals184.length > 0) {
    const refIds = referrals184.map(r => r.id.toString());
    
    const { data: referralBoosts } = await supabase
      .from('ton_farming_data')
      .select('*')
      .in('user_id', refIds);

    if (referralBoosts && referralBoosts.length > 0) {
      referralBoosts.forEach(b => {
        const user = referrals184.find(r => r.id.toString() === b.user_id);
        console.log(`  - User ${b.user_id} (@${user?.username}): пакет ${b.boost_package_id}, баланс ${b.farming_balance} TON`);
      });
    } else {
      console.log('  - У рефералов НЕТ активных TON Boost');
    }
  }

  // 5. Проверка типов данных
  console.log('\n5. АНАЛИЗ ПРОБЛЕМЫ:');
  console.log('- В ton_farming_data user_id хранится как STRING');
  console.log('- В users id хранится как NUMBER');
  console.log('- Планировщик ищет по числовым ID, но данные не совпадают');
  console.log('- Рефералы 186-190 есть в users, но их нет в списке обрабатываемых');
}

checkDataMismatch()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Ошибка:', err);
    process.exit(1);
  });