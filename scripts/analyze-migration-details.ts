import { supabase } from '../core/supabase.js';

async function analyzeMigrationDetails() {
  console.log('📊 ДЕТАЛЬНЫЙ АНАЛИЗ МИГРАЦИИ');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Проверяем пользователей которых нет в users
    console.log('🔍 ПОЛЬЗОВАТЕЛИ ОТСУТСТВУЮЩИЕ В USERS:\n');

    const { data: allUsers } = await supabase
      .from('users')
      .select('id')
      .order('id');

    const userIds = new Set(allUsers?.map(u => u.id) || []);
    
    const { data: uniFarming } = await supabase
      .from('uni_farming_data')
      .select('user_id, deposit_amount, farming_balance')
      .order('user_id');

    const missingUsers = uniFarming?.filter(f => !userIds.has(f.user_id)) || [];
    
    console.log(`Найдено ${missingUsers.length} пользователей только в uni_farming_data:`);
    missingUsers.forEach(u => {
      console.log(`- User ${u.user_id}: deposit=${u.deposit_amount}, balance=${u.farming_balance}`);
    });

    // 2. Проверяем пользователей с депозитами
    console.log('\n\n🔍 ПОЛЬЗОВАТЕЛИ С ДЕПОЗИТАМИ В СТАРОЙ ТАБЛИЦЕ:\n');

    const { data: usersWithDeposits } = await supabase
      .from('uni_farming_data')
      .select('user_id, deposit_amount, farming_balance')
      .gt('deposit_amount', 0)
      .order('user_id');

    const { data: usersDepositsInMain } = await supabase
      .from('users')
      .select('id, uni_deposit_amount, uni_farming_balance')
      .in('id', usersWithDeposits?.map(u => u.user_id) || [])
      .order('id');

    const mainUserMap = new Map(usersDepositsInMain?.map(u => [u.id, u]) || []);

    console.log('Пользователи с депозитами в uni_farming_data:');
    usersWithDeposits?.forEach(u => {
      const mainUser = mainUserMap.get(u.user_id);
      if (!mainUser) {
        console.log(`❌ User ${u.user_id}: НЕТ в users (deposit=${u.deposit_amount})`);
      } else if (mainUser.uni_deposit_amount === 0) {
        console.log(`⚠️  User ${u.user_id}: deposit в users=0, в старой=${u.deposit_amount}`);
      } else {
        console.log(`✅ User ${u.user_id}: deposit в users=${mainUser.uni_deposit_amount}, в старой=${u.deposit_amount}`);
      }
    });

    // 3. Анализ TON boost packages
    console.log('\n\n🔍 TON BOOST PACKAGES:\n');

    const { data: tonBoosts } = await supabase
      .from('ton_farming_data')
      .select('user_id, boost_package_id')
      .not('boost_package_id', 'is', null)
      .order('user_id');

    const { data: usersBoosts } = await supabase
      .from('users')
      .select('id, ton_boost_package')
      .in('id', tonBoosts?.map(t => t.user_id) || [])
      .order('id');

    const boostUserMap = new Map(usersBoosts?.map(u => [u.id, u]) || []);

    let boostMismatches = 0;
    console.log('TON Boost packages сравнение:');
    tonBoosts?.forEach(t => {
      const user = boostUserMap.get(t.user_id);
      if (!user || user.ton_boost_package !== t.boost_package_id) {
        console.log(`⚠️  User ${t.user_id}: users.ton_boost_package=${user?.ton_boost_package || 'null'}, ton_farming_data.boost_package_id=${t.boost_package_id}`);
        boostMismatches++;
      }
    });

    if (boostMismatches === 0) {
      console.log('✅ Все boost packages синхронизированы!');
    } else {
      console.log(`\n❌ Найдено ${boostMismatches} несовпадений boost packages`);
    }

    // 4. Итоговые выводы
    console.log('\n\n📊 ИТОГОВЫЕ ВЫВОДЫ:\n');
    console.log('1. КРИТИЧНО: Есть старые пользователи (id < 25) которых нет в таблице users');
    console.log('2. ВАЖНО: Эти пользователи имеют депозиты по 100 UNI');
    console.log('3. ЗАМЕЧЕНО: Новые пользователи (id > 25) работают только с таблицей users');
    console.log('4. ВЫВОД: Система эволюционировала от отдельных таблиц к единой таблице users');
    console.log('');
    console.log('🎯 ЧТО НУЖНО СДЕЛАТЬ:');
    console.log('1. Создать недостающих пользователей в таблице users');
    console.log('2. Перенести их депозиты и балансы');
    console.log('3. Синхронизировать boost packages');
    console.log('4. Создать SQL Views для совместимости');

  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  }
}

// Запуск анализа
console.log('Анализирую детали миграции...\n');
analyzeMigrationDetails();