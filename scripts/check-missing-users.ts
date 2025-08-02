import { supabase } from '../core/supabase.js';

async function checkMissingUsers() {
  console.log('🔍 ПРОВЕРКА ПРОПАВШИХ ПОЛЬЗОВАТЕЛЕЙ (259-307)');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Проверяем максимальный ID в таблице users
    const { data: maxUser } = await supabase
      .from('users')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    console.log(`Максимальный ID в таблице users: ${maxUser?.id || 'не найден'}\n`);

    // 2. Проверяем диапазон пользователей
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, telegram_id, username')
      .gte('id', 250)
      .lte('id', 310)
      .order('id');

    console.log('Пользователи в диапазоне 250-310:');
    allUsers?.forEach(u => {
      console.log(`- User ${u.id}: telegram_id=${u.telegram_id}, username=${u.username}`);
    });

    // 3. Проверяем архивные таблицы
    console.log('\n\n🔍 ПРОВЕРКА АРХИВНЫХ ТАБЛИЦ:\n');

    // Проверяем uni_farming_data
    const { data: uniFarmingUsers } = await supabase
      .from('uni_farming_data')
      .select('user_id')
      .gte('user_id', 259)
      .lte('user_id', 307)
      .order('user_id');

    if (uniFarmingUsers && uniFarmingUsers.length > 0) {
      console.log(`Найдено ${uniFarmingUsers.length} пользователей в uni_farming_data (259-307):`);
      uniFarmingUsers.forEach(u => console.log(`- User ${u.user_id}`));
    } else {
      console.log('В uni_farming_data нет пользователей 259-307');
    }

    // Проверяем ton_farming_data
    const { data: tonFarmingUsers } = await supabase
      .from('ton_farming_data')
      .select('user_id')
      .gte('user_id', 259)
      .lte('user_id', 307)
      .order('user_id');

    if (tonFarmingUsers && tonFarmingUsers.length > 0) {
      console.log(`\nНайдено ${tonFarmingUsers.length} пользователей в ton_farming_data (259-307):`);
      tonFarmingUsers.forEach(u => console.log(`- User ${u.user_id}`));
    } else {
      console.log('\nВ ton_farming_data нет пользователей 259-307');
    }

    // 4. Проверяем транзакции этих пользователей
    console.log('\n\n🔍 ПРОВЕРКА ТРАНЗАКЦИЙ:\n');

    const { data: transactions } = await supabase
      .from('transactions')
      .select('user_id, created_at')
      .gte('user_id', 259)
      .lte('user_id', 307)
      .order('user_id')
      .limit(20);

    if (transactions && transactions.length > 0) {
      console.log(`Найдено ${transactions.length} транзакций для пользователей 259-307:`);
      const uniqueUsers = [...new Set(transactions.map(t => t.user_id))];
      console.log(`Уникальные пользователи с транзакциями: ${uniqueUsers.join(', ')}`);
    } else {
      console.log('Нет транзакций для пользователей 259-307');
    }

    // 5. Проверяем количество всех пользователей
    console.log('\n\n📊 ОБЩАЯ СТАТИСТИКА:\n');

    const { count: totalCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { data: userIds } = await supabase
      .from('users')
      .select('id')
      .order('id');

    const ids = userIds?.map(u => u.id) || [];
    const missingIds = [];
    
    // Находим пропущенные ID
    for (let i = 1; i <= 307; i++) {
      if (!ids.includes(i)) {
        missingIds.push(i);
      }
    }

    console.log(`Всего пользователей в users: ${totalCount}`);
    console.log(`Пропущенные ID (1-307): ${missingIds.length} штук`);
    
    if (missingIds.length > 0 && missingIds.length <= 50) {
      console.log(`Пропущенные ID: ${missingIds.join(', ')}`);
    } else if (missingIds.length > 50) {
      console.log(`Пропущенные ID: ${missingIds.slice(0, 20).join(', ')}... и еще ${missingIds.length - 20}`);
    }

    // 6. Итоговый анализ
    console.log('\n\n📝 ИТОГОВЫЙ АНАЛИЗ:\n');
    
    if (maxUser?.id < 259) {
      console.log('❌ Пользователи 259-307 НЕ были созданы в таблице users!');
      console.log('Возможные причины:');
      console.log('1. Они не существовали в старых таблицах uni_farming_data/ton_farming_data');
      console.log('2. Миграция обработала только существующие записи');
      console.log('3. Эти пользователи могли быть удалены ранее');
    } else {
      console.log('✅ Найдены пользователи с ID выше 258');
    }

  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
}

// Запуск проверки
console.log('Проверяю пропавших пользователей...\n');
checkMissingUsers();