/**
 * КОМПЛЕКСНАЯ ДИАГНОСТИКА РЕФЕРАЛЬНОЙ СИСТЕМЫ
 * Анализ проблемы с нерабочими реферальными связями
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function comprehensiveReferralDiagnosis() {
  console.log('=== КОМПЛЕКСНАЯ ДИАГНОСТИКА РЕФЕРАЛЬНОЙ СИСТЕМЫ ===\n');
  
  try {
    // 1. ПРОВЕРКА НОВОГО РЕФЕРАЛЬНОГО КОДА
    console.log('🔍 1. АНАЛИЗ НОВОГО РЕФЕРАЛЬНОГО КОДА');
    const newRefCode = 'REF_1752857057647_tqnd8f';
    
    const { data: newUser, error: newUserError } = await supabase
      .from('users')
      .select('*')
      .eq('ref_code', newRefCode)
      .single();
    
    if (newUserError) {
      console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Новый пользователь с реферальным кодом НЕ НАЙДЕН');
      console.log('   Ошибка:', newUserError.message);
      console.log('   Это означает, что регистрация не завершилась успешно');
    } else {
      console.log('✅ Новый пользователь найден:');
      console.log(`   ID: ${newUser.id}`);
      console.log(`   Telegram ID: ${newUser.telegram_id}`);
      console.log(`   Username: ${newUser.username}`);
      console.log(`   Referred by: ${newUser.referred_by || 'НЕТ'}`);
      console.log(`   Создан: ${new Date(newUser.created_at).toLocaleString('ru-RU')}`);
    }
    
    // 2. ПРОВЕРКА РЕФЕРЕРА
    console.log('\n🔗 2. ПРОВЕРКА РЕФЕРЕРА');
    const referrerCode = 'REF_1750079004411_nddfp2';
    
    const { data: referrer, error: referrerError } = await supabase
      .from('users')
      .select('*')
      .eq('ref_code', referrerCode)
      .single();
    
    if (referrerError) {
      console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Реферер НЕ НАЙДЕН');
      console.log('   Ошибка:', referrerError.message);
    } else {
      console.log('✅ Реферер найден:');
      console.log(`   ID: ${referrer.id} (DimaOsadchuk)`);
      console.log(`   Telegram ID: ${referrer.telegram_id}`);
      console.log(`   Username: ${referrer.username}`);
    }
    
    // 3. ПРОВЕРКА РЕФЕРАЛЬНЫХ СВЯЗЕЙ
    console.log('\n🔍 3. ПРОВЕРКА РЕФЕРАЛЬНЫХ СВЯЗЕЙ В БД');
    
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (referralsError) {
      console.log('❌ Ошибка получения рефералов:', referralsError.message);
    } else {
      console.log(`Всего записей в referrals: ${referrals.length}`);
      
      if (referrals.length > 0) {
        console.log('Последние реферальные связи:');
        referrals.forEach((ref, index) => {
          const time = new Date(ref.created_at).toLocaleString('ru-RU');
          console.log(`${index + 1}. User ${ref.user_id} -> Referrer ${ref.referrer_id}, Время: ${time}`);
        });
      }
    }
    
    // 4. АНАЛИЗ ПОСЛЕДНИХ РЕГИСТРАЦИЙ
    console.log('\n👥 4. АНАЛИЗ ПОСЛЕДНИХ РЕГИСТРАЦИЙ');
    
    const { data: recentUsers, error: recentUsersError } = await supabase
      .from('users')
      .select('id, telegram_id, username, ref_code, referred_by, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentUsersError) {
      console.log('❌ Ошибка получения пользователей:', recentUsersError.message);
    } else {
      console.log('Последние регистрации:');
      recentUsers.forEach((user, index) => {
        const hasReferral = user.referred_by ? '✅ Есть' : '❌ Нет';
        const time = new Date(user.created_at).toLocaleString('ru-RU');
        console.log(`${index + 1}. ID: ${user.id}, TG: ${user.telegram_id}, Реферал: ${hasReferral}, Время: ${time}`);
      });
      
      // Статистика
      const usersWithReferrals = recentUsers.filter(u => u.referred_by).length;
      const successRate = (usersWithReferrals / recentUsers.length) * 100;
      console.log(`\n📊 Статистика: ${usersWithReferrals} из ${recentUsers.length} имеют реферальные связи (${successRate.toFixed(1)}%)`);
    }
    
    // 5. ПОИСК ПРОБЛЕМНОГО ПОЛЬЗОВАТЕЛЯ
    console.log('\n🔍 5. ПОИСК ПРОБЛЕМНОГО ПОЛЬЗОВАТЕЛЯ');
    
    // Поиск по времени регистрации (последние 30 минут)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: recentRegistrations, error: recentRegError } = await supabase
      .from('users')
      .select('*')
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false });
    
    if (recentRegError) {
      console.log('❌ Ошибка поиска недавних регистраций:', recentRegError.message);
    } else {
      console.log(`Регистрации за последние 30 минут: ${recentRegistrations.length}`);
      
      if (recentRegistrations.length > 0) {
        console.log('Недавние регистрации:');
        recentRegistrations.forEach((user, index) => {
          const time = new Date(user.created_at).toLocaleString('ru-RU');
          const hasReferral = user.referred_by ? '✅ Есть' : '❌ Нет';
          console.log(`${index + 1}. ID: ${user.id}, TG: ${user.telegram_id}, Реферал: ${hasReferral}, Время: ${time}`);
        });
      }
    }
    
    // 6. ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ
    console.log('\n🔍 6. ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ');
    
    // Проверяем, есть ли пользователи с referred_by, но без записей в referrals
    const { data: usersWithRefBy, error: refByError } = await supabase
      .from('users')
      .select('id, telegram_id, username, referred_by, created_at')
      .not('referred_by', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (refByError) {
      console.log('❌ Ошибка получения пользователей с referred_by:', refByError.message);
    } else {
      console.log(`Пользователи с заполненным referred_by: ${usersWithRefBy.length}`);
      
      if (usersWithRefBy.length > 0) {
        console.log('Пользователи с referred_by:');
        for (const user of usersWithRefBy) {
          const time = new Date(user.created_at).toLocaleString('ru-RU');
          console.log(`   ID: ${user.id}, referred_by: ${user.referred_by}, Время: ${time}`);
          
          // Проверяем, есть ли запись в referrals
          const { data: refRecord, error: refRecordError } = await supabase
            .from('referrals')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (refRecordError) {
            console.log(`   ❌ НЕТ записи в referrals для пользователя ${user.id}`);
          } else {
            console.log(`   ✅ Есть запись в referrals: referrer_id=${refRecord.referrer_id}`);
          }
        }
      }
    }
    
    // 7. АНАЛИЗ АРХИТЕКТУРНЫХ ПРОБЛЕМ
    console.log('\n🏗️ 7. АНАЛИЗ АРХИТЕКТУРНЫХ ПРОБЛЕМ');
    console.log('Потенциальные проблемы:');
    console.log('1. JWT ошибки прерывают processReferral()');
    console.log('2. Динамический импорт не работает в production');
    console.log('3. Реферальная связь не сохраняется в БД');
    console.log('4. Ошибки авторизации блокируют создание записей');
    
    // 8. РЕКОМЕНДАЦИИ ПО ДИАГНОСТИКЕ
    console.log('\n💡 8. РЕКОМЕНДАЦИИ ПО ДИАГНОСТИКЕ');
    console.log('Необходимо проверить:');
    console.log('1. Серверные логи на момент регистрации');
    console.log('2. Вызывается ли processReferral() при создании пользователя');
    console.log('3. Создается ли пользователь с правильным referred_by');
    console.log('4. Работает ли динамический импорт ReferralService');
    console.log('5. Сохраняется ли запись в таблице referrals');
    
  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error);
  }
}

comprehensiveReferralDiagnosis();