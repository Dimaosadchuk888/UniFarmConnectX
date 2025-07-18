/**
 * Диагностика проблемы с JWT токенами и реферальными связями
 * Проверяем порядок операций при регистрации
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Настройки Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseJWTReferralIssue() {
  console.log('=== ДИАГНОСТИКА JWT И РЕФЕРАЛЬНЫХ СВЯЗЕЙ ===\n');
  
  try {
    // 1. Проверяем последние регистрации
    console.log('📊 1. АНАЛИЗ ПОСЛЕДНИХ РЕГИСТРАЦИЙ');
    const { data: recentUsers, error: usersError } = await supabase
      .from('users')
      .select('id, telegram_id, username, first_name, referred_by, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (usersError) {
      console.error('❌ Ошибка получения пользователей:', usersError);
      return;
    }

    console.log('Последние 10 регистраций:');
    recentUsers.forEach((user, index) => {
      const hasReferral = user.referred_by ? '✅ Есть' : '❌ Нет';
      const createdTime = new Date(user.created_at).toLocaleString('ru-RU');
      console.log(`${index + 1}. ID: ${user.id}, TG: ${user.telegram_id}, Реферал: ${hasReferral}, Время: ${createdTime}`);
    });

    // 2. Проверяем таблицу referrals
    console.log('\n📋 2. ПРОВЕРКА ТАБЛИЦЫ REFERRALS');
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('referred_user_id, referrer_user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (referralsError) {
      console.error('❌ Ошибка получения реферальных связей:', referralsError);
    } else {
      console.log(`Количество записей в referrals: ${referrals.length}`);
      if (referrals.length > 0) {
        console.log('Последние реферальные связи:');
        referrals.forEach((ref, index) => {
          const createdTime = new Date(ref.created_at).toLocaleString('ru-RU');
          console.log(`${index + 1}. Реферал: ${ref.referred_user_id} -> Пригласил: ${ref.referrer_user_id}, Время: ${createdTime}`);
        });
      } else {
        console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Таблица referrals пуста!');
      }
    }

    // 3. Проверяем реферальный код пользователя
    console.log('\n🔗 3. ПРОВЕРКА РЕФЕРАЛЬНОГО КОДА ПОЛЬЗОВАТЕЛЯ');
    const { data: userWithRefCode, error: refCodeError } = await supabase
      .from('users')
      .select('id, telegram_id, username, ref_code')
      .eq('ref_code', 'REF_1750079004411_nddfp2')
      .single();

    if (refCodeError) {
      console.error('❌ Ошибка поиска пользователя с реферальным кодом:', refCodeError);
    } else {
      console.log('✅ Владелец реферального кода найден:');
      console.log(`   ID: ${userWithRefCode.id}`);
      console.log(`   Telegram ID: ${userWithRefCode.telegram_id}`);
      console.log(`   Username: ${userWithRefCode.username}`);
      console.log(`   Реферальный код: ${userWithRefCode.ref_code}`);
    }

    // 4. Проверяем логику processReferral
    console.log('\n⚙️ 4. АНАЛИЗ ЛОГИКИ ОБРАБОТКИ РЕФЕРАЛОВ');
    
    // Проверяем, вызывается ли processReferral для недавних пользователей
    const usersWithoutReferrals = recentUsers.filter(u => !u.referred_by);
    console.log(`Пользователи без реферальных связей: ${usersWithoutReferrals.length} из ${recentUsers.length}`);
    
    if (usersWithoutReferrals.length > 0) {
      console.log('❌ ПРОБЛЕМА: Большинство пользователей регистрируются без реферальных связей');
    }

    // 5. Проверяем временные интервалы
    console.log('\n⏱️ 5. АНАЛИЗ ВРЕМЕННЫХ ИНТЕРВАЛОВ');
    const now = new Date();
    recentUsers.forEach(user => {
      const createdAt = new Date(user.created_at);
      const timeDiff = (now - createdAt) / (1000 * 60); // в минутах
      const timeStr = timeDiff < 60 ? `${Math.round(timeDiff)} мин` : `${Math.round(timeDiff / 60)} час`;
      console.log(`Пользователь ${user.id}: зарегистрирован ${timeStr} назад`);
    });

    // 6. Проверяем процесс аутентификации
    console.log('\n🔐 6. ДИАГНОСТИКА ПРОЦЕССА АУТЕНТИФИКАЦИИ');
    
    // Симулируем процесс аутентификации с реферальным кодом
    const simulationResult = await simulateAuthenticationFlow();
    console.log('Результат симуляции:', simulationResult);

    // 7. Выводы
    console.log('\n🎯 7. ВЫВОДЫ И РЕКОМЕНДАЦИИ');
    
    const referralSuccessRate = recentUsers.filter(u => u.referred_by).length / recentUsers.length * 100;
    console.log(`Успешность реферальной системы: ${referralSuccessRate.toFixed(1)}%`);
    
    if (referralSuccessRate < 50) {
      console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Реферальная система не работает!');
      console.log('Возможные причины:');
      console.log('1. processReferral() не вызывается при регистрации');
      console.log('2. Ошибки JWT прерывают процесс до обработки рефералов');
      console.log('3. Проблемы с извлечением реферального кода из URL');
      console.log('4. Ошибки в логике createUser() или processReferral()');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error);
  }
}

async function simulateAuthenticationFlow() {
  console.log('\n🧪 СИМУЛЯЦИЯ ПРОЦЕССА АУТЕНТИФИКАЦИИ');
  
  // Проверяем, что происходит при получении реферального кода
  const refCode = 'REF_1750079004411_nddfp2';
  
  try {
    // 1. Проверяем существование реферального кода
    const { data: referrerUser, error: referrerError } = await supabase
      .from('users')
      .select('id, telegram_id, username')
      .eq('ref_code', refCode)
      .single();
    
    if (referrerError) {
      return {
        success: false,
        step: 'referrer_lookup',
        error: 'Реферальный код не найден'
      };
    }
    
    console.log(`✅ Реферер найден: ${referrerUser.username} (ID: ${referrerUser.id})`);
    
    // 2. Проверяем, что бы произошло при создании пользователя
    const mockUserData = {
      telegram_id: 999999999,
      username: 'test_user_jwt_diagnosis',
      first_name: 'Test User',
      ref_by: refCode
    };
    
    console.log('Данные для создания пользователя:', mockUserData);
    
    // 3. Проверяем логику processReferral
    console.log('✅ Логика processReferral должна:');
    console.log(`   - Найти пользователя с ref_code: ${refCode}`);
    console.log(`   - Создать связь в таблице referrals`);
    console.log(`   - Обновить поле referred_by у нового пользователя`);
    
    return {
      success: true,
      referrer_found: true,
      referrer_id: referrerUser.id,
      ref_code: refCode
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Запуск диагностики
diagnoseJWTReferralIssue();