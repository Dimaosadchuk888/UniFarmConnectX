// Тест реферальной системы с детальным логированием
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testReferralWithLogging() {
  console.log('=== ТЕСТ РЕФЕРАЛЬНОЙ СИСТЕМЫ С ЛОГИРОВАНИЕМ ===');
  
  // Уникальные тестовые данные
  const testTelegramId = Math.floor(Date.now() / 1000);
  const testUsername = `test_${testTelegramId}`;
  const refCode = 'REF_1752755835358_yjrusv'; // Код User 184
  
  console.log('🚀 Тестовые данные:');
  console.log(`   telegram_id: ${testTelegramId}`);
  console.log(`   username: ${testUsername}`);
  console.log(`   ref_code: ${refCode}`);
  
  try {
    // Проверим текущее состояние User 184
    console.log('\n1. Проверка User 184 (владелец реферального кода)...');
    
    const { data: referrerUser, error: referrerError } = await supabase
      .from('users')
      .select('id, telegram_id, username, ref_code')
      .eq('id', 184)
      .single();
    
    if (referrerError) {
      console.log('❌ Ошибка поиска User 184:', referrerError.message);
      return;
    }
    
    console.log('✅ User 184 найден:');
    console.log(`   ID: ${referrerUser.id}`);
    console.log(`   telegram_id: ${referrerUser.telegram_id}`);
    console.log(`   username: ${referrerUser.username}`);
    console.log(`   ref_code: ${referrerUser.ref_code}`);
    
    if (referrerUser.ref_code !== refCode) {
      console.log(`❌ Реферальный код НЕ совпадает! Ожидали: ${refCode}, получили: ${referrerUser.ref_code}`);
      return;
    }
    
    console.log('✅ Реферальный код совпадает');
    
    // Проверяем сервер
    console.log('\n2. Проверка сервера...');
    
    const healthResponse = await fetch('http://localhost:3000/health');
    if (!healthResponse.ok) {
      console.log('❌ Сервер не отвечает');
      return;
    }
    
    console.log('✅ Сервер работает');
    
    // Отправляем запрос
    console.log('\n3. Отправка запроса регистрации...');
    
    const authData = {
      direct_registration: true,
      telegram_id: testTelegramId,
      username: testUsername,
      first_name: "Test User",
      refBy: refCode
    };
    
    console.log('📤 Данные запроса:', JSON.stringify(authData, null, 2));
    
    const authResponse = await fetch('http://localhost:3000/api/v2/auth/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authData)
    });
    
    console.log(`📥 Ответ: ${authResponse.status} ${authResponse.statusText}`);
    
    const authResult = await authResponse.json();
    console.log('📋 Результат:', JSON.stringify(authResult, null, 2));
    
    if (!authResult.success) {
      console.log('❌ Регистрация не удалась');
      return;
    }
    
    const newUserId = authResult.data.user.id;
    console.log(`✅ Новый пользователь создан: ${newUserId}`);
    
    // Ждем немного для обработки
    console.log('\n4. Ожидание 2 секунды для обработки...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Проверяем БД
    console.log('\n5. Проверка БД...');
    
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, referred_by, created_at')
      .eq('id', newUserId)
      .single();
    
    if (userError) {
      console.log('❌ Ошибка поиска пользователя:', userError.message);
      return;
    }
    
    console.log('✅ Пользователь найден в БД:');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   telegram_id: ${newUser.telegram_id}`);
    console.log(`   username: ${newUser.username}`);
    console.log(`   referred_by: ${newUser.referred_by}`);
    console.log(`   created_at: ${newUser.created_at}`);
    
    // Проверяем referrals
    console.log('\n6. Проверка referrals...');
    
    const { data: referralRecords, error: referralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('user_id', newUserId);
    
    if (referralError) {
      console.log('❌ Ошибка поиска referrals:', referralError.message);
    } else {
      console.log(`✅ Найдено ${referralRecords.length} записей в referrals`);
      
      if (referralRecords.length > 0) {
        referralRecords.forEach(record => {
          console.log(`   Запись: user_id=${record.user_id}, inviter_id=${record.inviter_id}, level=${record.level}`);
        });
      }
    }
    
    // Проверяем логи сервера (если есть)
    console.log('\n7. Проверка логов сервера...');
    
    // Проверяем все записи в referrals для User 184
    console.log('\n8. Проверка всех рефералов User 184...');
    
    const { data: allReferrals, error: allReferralsError } = await supabase
      .from('referrals')
      .select('*')
      .eq('inviter_id', 184);
    
    if (allReferralsError) {
      console.log('❌ Ошибка поиска всех рефералов:', allReferralsError.message);
    } else {
      console.log(`✅ User 184 имеет ${allReferrals.length} рефералов`);
      
      if (allReferrals.length > 0) {
        allReferrals.forEach(record => {
          console.log(`   Реферал: user_id=${record.user_id}, level=${record.level}, created_at=${record.created_at}`);
        });
      }
    }
    
    // Очищаем тестовые данные
    console.log('\n9. Очистка тестовых данных...');
    
    // Удаляем из referrals если есть
    if (referralRecords && referralRecords.length > 0) {
      await supabase.from('referrals').delete().eq('user_id', newUserId);
      console.log('✅ Записи в referrals удалены');
    }
    
    // Удаляем пользователя
    await supabase.from('users').delete().eq('id', newUserId);
    console.log('✅ Пользователь удален');
    
    console.log('\n=== ИТОГОВЫЙ РЕЗУЛЬТАТ ===');
    
    if (newUser.referred_by === 184) {
      console.log('🎉 УСПЕХ: referred_by установлен правильно!');
    } else {
      console.log('❌ НЕУДАЧА: referred_by не установлен');
      console.log('   Возможные причины:');
      console.log('   1. processReferral() не вызывается');
      console.log('   2. Ошибка в processReferral()');
      console.log('   3. Проблема с маппингом параметров');
    }
    
    if (referralRecords && referralRecords.length > 0) {
      console.log('🎉 УСПЕХ: Запись в referrals создана!');
    } else {
      console.log('❌ НЕУДАЧА: Запись в referrals не создана');
    }
    
  } catch (error) {
    console.log('❌ Ошибка теста:', error.message);
    console.log('Stack trace:', error.stack);
  }
}

testReferralWithLogging().catch(console.error);