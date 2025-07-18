/**
 * Диагностика проблемы с реферальными ссылками - JavaScript версия
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL или SUPABASE_KEY не установлены в переменных окружения');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugReferralIssue() {
  console.log('\n🔍 ДИАГНОСТИКА ПРОБЛЕМЫ С РЕФЕРАЛЬНЫМИ ССЫЛКАМИ');
  console.log('='.repeat(60));

  try {
    // 1. Проверяем пользователя с реферальным кодом REF_1750079004411_nddfp2
    console.log('\n1️⃣ Поиск владельца реферального кода REF_1750079004411_nddfp2...');
    
    const { data: referrer, error: referrerError } = await supabase
      .from('users')
      .select('*')
      .eq('ref_code', 'REF_1750079004411_nddfp2')
      .single();

    if (referrerError) {
      console.log('❌ Ошибка поиска реферера:', referrerError.message);
      return;
    }

    if (!referrer) {
      console.log('❌ Пользователь с реферальным кодом REF_1750079004411_nddfp2 НЕ НАЙДЕН');
      return;
    }

    console.log('✅ Реферер найден:', {
      id: referrer.id,
      telegram_id: referrer.telegram_id,
      username: referrer.username,
      first_name: referrer.first_name,
      ref_code: referrer.ref_code,
      created_at: referrer.created_at
    });

    // 2. Ищем всех пользователей, которые были зарегистрированы с этим реферальным кодом
    console.log('\n2️⃣ Поиск пользователей в поле referred_by...');
    
    // Проверяем по ID реферера (новый формат)
    const { data: referredUsersById, error: referredByIdError } = await supabase
      .from('users')
      .select('*')
      .eq('referred_by', referrer.id)
      .order('created_at', { ascending: false });

    // Проверяем по реферальному коду (старый формат)
    const { data: referredUsersByCode, error: referredByCodeError } = await supabase
      .from('users')
      .select('*')
      .eq('referred_by', 'REF_1750079004411_nddfp2')
      .order('created_at', { ascending: false });

    console.log(`📊 Рефералов по ID (${referrer.id}): ${referredUsersById?.length || 0}`);
    console.log(`📊 Рефералов по коду (REF_1750079004411_nddfp2): ${referredUsersByCode?.length || 0}`);

    // 3. Ищем пользователей, зарегистрированных недавно
    console.log('\n3️⃣ Поиск недавно зарегистрированных пользователей (последние 3 дня)...');
    
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentUsers, error: recentError } = await supabase
      .from('users')
      .select('*')
      .gte('created_at', threeDaysAgo)
      .order('created_at', { ascending: false })
      .limit(20);

    if (recentError) {
      console.log('❌ Ошибка поиска недавних пользователей:', recentError.message);
    } else {
      console.log(`📊 Найдено недавних пользователей: ${recentUsers?.length || 0}`);
      
      if (recentUsers && recentUsers.length > 0) {
        console.log('\n📋 Детали недавних пользователей:');
        recentUsers.forEach((user, index) => {
          console.log(`   ${index + 1}. ID: ${user.id}, TG: ${user.telegram_id}, Имя: ${user.first_name || 'Не указано'}, Реферер: ${user.referred_by || 'НЕТ'}, Создан: ${user.created_at}`);
        });
      }
    }

    // 4. Проверяем таблицу referrals на наличие записей
    console.log('\n4️⃣ Проверка таблицы referrals...');
    
    const { data: referralRecords, error: referralError } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (referralError) {
      console.log('❌ Ошибка получения данных из таблицы referrals:', referralError.message);
    } else {
      console.log(`📊 Записей в таблице referrals: ${referralRecords?.length || 0}`);
      
      if (referralRecords && referralRecords.length > 0) {
        console.log('\n📋 Последние записи в referrals:');
        referralRecords.forEach((record, index) => {
          console.log(`   ${index + 1}. Реферер: ${record.inviter_id}, Реферал: ${record.referred_user_id}, Создан: ${record.created_at}`);
        });
      }
    }

    // 5. Ищем пользователей с пустым или null referred_by среди недавних
    console.log('\n5️⃣ Анализ потенциально "потерянных" рефералов...');
    
    const { data: lostReferrals, error: lostError } = await supabase
      .from('users')
      .select('*')
      .gte('created_at', threeDaysAgo)
      .is('referred_by', null)
      .order('created_at', { ascending: false });

    if (lostError) {
      console.log('❌ Ошибка поиска потерянных рефералов:', lostError.message);
    } else {
      console.log(`⚠️ Пользователей без реферера среди недавних: ${lostReferrals?.length || 0}`);
      
      if (lostReferrals && lostReferrals.length > 0) {
        console.log('\n📋 Потерянные рефералы:');
        lostReferrals.forEach((user, index) => {
          console.log(`   ${index + 1}. ID: ${user.id}, TG: ${user.telegram_id}, Имя: ${user.first_name || 'Не указано'}, Создан: ${user.created_at}`);
        });
      }
    }

    // 6. Финальный анализ
    console.log('\n📋 СВОДКА ДИАГНОСТИКИ:');
    console.log('='.repeat(40));
    console.log(`✅ Реферер (ID ${referrer.id}) с кодом REF_1750079004411_nddfp2 существует`);
    console.log(`📊 Прямых рефералов по ID: ${referredUsersById?.length || 0}`);
    console.log(`📊 Прямых рефералов по коду: ${referredUsersByCode?.length || 0}`);
    console.log(`📊 Записей в таблице referrals: ${referralRecords?.length || 0}`);
    console.log(`📊 Недавних пользователей: ${recentUsers?.length || 0}`);
    console.log(`⚠️ Недавних пользователей БЕЗ реферера: ${lostReferrals?.length || 0}`);

    if ((lostReferrals?.length || 0) > 0 && (referredUsersById?.length || 0) === 0 && (referredUsersByCode?.length || 0) === 0) {
      console.log('\n🚨 ОБНАРУЖЕНА ПРОБЛЕМА:');
      console.log('   ❌ Есть недавно зарегистрированные пользователи');
      console.log('   ❌ НО у них НЕТ реферера в поле referred_by');
      console.log('   ❌ Это подтверждает проблему с обработкой реферальных ссылок');
      console.log('\n💡 ВЕРОЯТНЫЕ ПРИЧИНЫ:');
      console.log('   1. Ошибка авторизации прерывает обработку реферального кода');
      console.log('   2. Реферальный код теряется при редиректах или ошибках');
      console.log('   3. processReferral() не вызывается или падает с ошибкой');
      console.log('   4. Проблема с обновлением поля referred_by в БД');
    } else if ((referredUsersById?.length || 0) > 0 || (referredUsersByCode?.length || 0) > 0) {
      console.log('\n✅ РЕФЕРАЛЬНАЯ СИСТЕМА РАБОТАЕТ:');
      console.log('   ✅ Найдены успешно привязанные рефералы');
      console.log('   ✅ Проблема может быть в конкретных случаях или недавних изменениях');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error);
  }
}

// Запускаем диагностику
debugReferralIssue().then(() => {
  console.log('\n✅ Диагностика завершена');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Ошибка выполнения диагностики:', error);
  process.exit(1);
});