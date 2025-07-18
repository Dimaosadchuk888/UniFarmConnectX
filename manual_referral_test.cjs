/**
 * РУЧНОЙ ТЕСТ РЕФЕРАЛЬНОЙ СИСТЕМЫ
 * Проверяем работу системы через прямые SQL запросы
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function manualReferralTest() {
  console.log('=== РУЧНОЙ ТЕСТ РЕФЕРАЛЬНОЙ СИСТЕМЫ ===\n');
  
  try {
    // 1. Проверяем нового пользователя ID 224
    console.log('🔍 1. ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ ID 224');
    
    const { data: user224, error: user224Error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 224)
      .single();
    
    if (user224Error) {
      console.log('❌ Пользователь 224 не найден:', user224Error.message);
    } else {
      console.log('✅ Пользователь 224 найден:');
      console.log(`   ID: ${user224.id}`);
      console.log(`   Telegram ID: ${user224.telegram_id}`);
      console.log(`   Username: ${user224.username}`);
      console.log(`   Referred by: ${user224.referred_by || 'НЕТ'}`);
      console.log(`   Время создания: ${new Date(user224.created_at).toLocaleString('ru-RU')}`);
      
      // Проверяем, есть ли он в referrals
      const { data: referral224, error: referral224Error } = await supabase
        .from('referrals')
        .select('*')
        .eq('user_id', 224);
      
      if (referral224Error) {
        console.log('❌ Ошибка поиска в referrals:', referral224Error.message);
      } else if (referral224.length > 0) {
        console.log('✅ Найдены записи в referrals:');
        referral224.forEach((ref, index) => {
          console.log(`   ${index + 1}. ${JSON.stringify(ref)}`);
        });
      } else {
        console.log('❌ Записи в referrals НЕ НАЙДЕНЫ');
      }
    }
    
    // 2. Проверяем реферера 
    console.log('\n🔗 2. ПРОВЕРКА РЕФЕРЕРА');
    
    const { data: referrer, error: referrerError } = await supabase
      .from('users')
      .select('*')
      .eq('ref_code', 'REF_1750079004411_nddfp2')
      .single();
    
    if (referrerError) {
      console.log('❌ Реферер не найден:', referrerError.message);
    } else {
      console.log('✅ Реферер найден:');
      console.log(`   ID: ${referrer.id}`);
      console.log(`   Telegram ID: ${referrer.telegram_id}`);
      console.log(`   Username: ${referrer.username}`);
      console.log(`   Реферальный код: ${referrer.ref_code}`);
    }
    
    // 3. Проверяем структуру таблицы referrals
    console.log('\n🔍 3. СТРУКТУРА ТАБЛИЦЫ REFERRALS');
    
    const { data: referralsData, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .limit(5);
    
    if (referralsError) {
      console.log('❌ Ошибка получения referrals:', referralsError.message);
    } else {
      console.log(`📊 Всего записей в referrals: ${referralsData.length}`);
      
      if (referralsData.length > 0) {
        console.log('Структура таблицы:');
        console.log('Поля:', Object.keys(referralsData[0]));
        console.log('Примеры записей:');
        referralsData.forEach((record, index) => {
          console.log(`   ${index + 1}. ${JSON.stringify(record)}`);
        });
      }
    }
    
    // 4. Проверяем последние пользователи с referred_by
    console.log('\n👥 4. ПОЛЬЗОВАТЕЛИ С REFERRED_BY');
    
    const { data: usersWithRef, error: usersWithRefError } = await supabase
      .from('users')
      .select('id, telegram_id, username, referred_by, created_at')
      .not('referred_by', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (usersWithRefError) {
      console.log('❌ Ошибка получения пользователей с referred_by:', usersWithRefError.message);
    } else {
      console.log(`📊 Пользователи с referred_by: ${usersWithRef.length}`);
      
      if (usersWithRef.length > 0) {
        console.log('Пользователи:');
        usersWithRef.forEach((user, index) => {
          const time = new Date(user.created_at).toLocaleString('ru-RU');
          console.log(`   ${index + 1}. ID: ${user.id}, TG: ${user.telegram_id}, referred_by: ${user.referred_by}, время: ${time}`);
        });
      }
    }
    
    // 5. Анализ проблемы
    console.log('\n🔍 5. АНАЛИЗ ПРОБЛЕМЫ');
    
    if (user224 && !user224.referred_by) {
      console.log('❌ ПРОБЛЕМА: Пользователь 224 создан БЕЗ реферальной связи');
      console.log('   Это означает, что processReferral() НЕ СРАБОТАЛ');
      console.log('   Возможные причины:');
      console.log('   1. Статический импорт создает циклическую зависимость');
      console.log('   2. ReferralService.processReferral() выбрасывает исключение');
      console.log('   3. Ошибка в логике создания пользователя');
      console.log('   4. ref_by не передается в findOrCreateFromTelegram()');
    }
    
    // 6. Рекомендации
    console.log('\n💡 6. РЕКОМЕНДАЦИИ');
    console.log('Для диагностики проблемы:');
    console.log('1. Добавить больше логирования в AuthService');
    console.log('2. Проверить серверные логи на наличие ошибок');
    console.log('3. Протестировать ReferralService.processReferral() отдельно');
    console.log('4. Убедиться, что ref_by передается в запросе аутентификации');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

manualReferralTest();