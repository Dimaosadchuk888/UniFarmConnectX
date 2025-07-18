/**
 * ТРАССИРОВКА ПУТИ РЕФЕРАЛЬНОЙ ССЫЛКИ
 * Проверяем весь путь от frontend до processReferralInline()
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function traceReferralPath() {
  console.log('=== ТРАССИРОВКА ПУТИ РЕФЕРАЛЬНОЙ ССЫЛКИ ===\n');
  
  try {
    // 1. Анализируем последние созданные пользователи
    console.log('🔍 1. АНАЛИЗ ПОСЛЕДНИХ СОЗДАННЫХ ПОЛЬЗОВАТЕЛЕЙ');
    
    const { data: recentUsers } = await supabase
      .from('users')
      .select('id, telegram_id, username, referred_by, ref_code, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentUsers && recentUsers.length > 0) {
      console.log(`✅ Найдено ${recentUsers.length} недавних пользователей:`);
      
      recentUsers.forEach((user, index) => {
        const hasReferrer = user.referred_by !== null;
        const marker = hasReferrer ? '🔗' : '❌';
        const referrerText = hasReferrer ? `(referred_by: ${user.referred_by})` : '(NO REFERRER)';
        
        console.log(`   ${marker} User ${user.id}: ${user.username} ${referrerText}`);
        console.log(`     Создан: ${user.created_at}`);
        console.log(`     Telegram ID: ${user.telegram_id}`);
        console.log('');
      });
    } else {
      console.log('❌ Недавние пользователи не найдены');
    }
    
    // 2. Проверяем пользователей с referred_by
    console.log('\n🔍 2. ПОЛЬЗОВАТЕЛИ С РЕФЕРАЛЬНЫМИ СВЯЗЯМИ');
    
    const { data: usersWithReferrers } = await supabase
      .from('users')
      .select('id, telegram_id, username, referred_by, created_at')
      .not('referred_by', 'is', null)
      .order('created_at', { ascending: false });
    
    if (usersWithReferrers && usersWithReferrers.length > 0) {
      console.log(`✅ Найдено ${usersWithReferrers.length} пользователей с реферальными связями:`);
      
      usersWithReferrers.forEach((user, index) => {
        console.log(`   🔗 User ${user.id}: ${user.username} → referred_by: ${user.referred_by}`);
        console.log(`     Создан: ${user.created_at}`);
        console.log(`     Telegram ID: ${user.telegram_id}`);
        console.log('');
      });
    } else {
      console.log('❌ Пользователи с реферальными связями не найдены');
    }
    
    // 3. Проверяем записи в referrals
    console.log('\n🔍 3. ЗАПИСИ В ТАБЛИЦЕ REFERRALS');
    
    const { data: referralRecords } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (referralRecords && referralRecords.length > 0) {
      console.log(`✅ Найдено ${referralRecords.length} записей в referrals:`);
      
      referralRecords.forEach((record, index) => {
        console.log(`   📝 User ${record.user_id} → Inviter ${record.inviter_id}`);
        console.log(`     Level: ${record.level}`);
        console.log(`     Создан: ${record.created_at}`);
        console.log(`     Ref Path: ${JSON.stringify(record.ref_path)}`);
        console.log('');
      });
    } else {
      console.log('❌ Записи в referrals не найдены');
    }
    
    // 4. Статистика по успешности
    console.log('\n🔍 4. СТАТИСТИКА УСПЕШНОСТИ РЕФЕРАЛЬНОЙ СИСТЕМЫ');
    
    const totalUsers = recentUsers ? recentUsers.length : 0;
    const usersWithReferrersCount = usersWithReferrers ? usersWithReferrers.length : 0;
    const referralRecordsCount = referralRecords ? referralRecords.length : 0;
    
    console.log(`📊 Общая статистика:`);
    console.log(`   Всего пользователей: ${totalUsers}`);
    console.log(`   С реферальными связями: ${usersWithReferrersCount}`);
    console.log(`   Записей в referrals: ${referralRecordsCount}`);
    
    const successRate = totalUsers > 0 ? (usersWithReferrersCount / totalUsers * 100).toFixed(1) : 0;
    console.log(`   Успешность: ${successRate}%`);
    
    // 5. Поиск User 224 в контексте
    console.log('\n🔍 5. КОНТЕКСТ USER 224');
    
    const user224 = recentUsers?.find(u => u.id === 224);
    if (user224) {
      console.log('✅ User 224 найден в недавних пользователях');
      console.log(`   Позиция: ${recentUsers.indexOf(user224) + 1} из ${totalUsers}`);
      console.log(`   Статус: ${user224.referred_by ? 'С реферальной связью' : 'Без реферальной связи'}`);
    } else {
      console.log('❌ User 224 не найден в недавних пользователях (создан давно)');
    }
    
    // 6. Финальный анализ
    console.log('\n🎯 6. ФИНАЛЬНЫЙ АНАЛИЗ');
    
    if (usersWithReferrersCount === 0) {
      console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Нет пользователей с реферальными связями');
      console.log('   processReferralInline() НЕ ВЫЗЫВАЕТСЯ при регистрации');
    } else if (usersWithReferrersCount === 1) {
      console.log('⚠️ ТОЛЬКО ОДИН ПОЛЬЗОВАТЕЛЬ имеет реферальную связь');
      console.log('   Это вероятно результат наших тестов, а не реальной работы системы');
    } else {
      console.log('✅ Несколько пользователей имеют реферальные связи');
      console.log('   Система может работать, но требует дополнительного анализа');
    }
    
    if (referralRecordsCount === 0) {
      console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Нет записей в referrals');
      console.log('   Таблица referrals не заполняется');
    } else if (referralRecordsCount < usersWithReferrersCount) {
      console.log('⚠️ РАСХОЖДЕНИЕ: Записей в referrals меньше чем пользователей с referred_by');
      console.log('   Некоторые связи не попадают в таблицу referrals');
    } else {
      console.log('✅ Количество записей в referrals соответствует количеству пользователей с referred_by');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка трассировки:', error);
  }
}

traceReferralPath();