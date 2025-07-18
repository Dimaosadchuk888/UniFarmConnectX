// Тест реферальной системы с прямой регистрацией (обход Telegram валидации)
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testReferralSystemDirect() {
  console.log('=== ТЕСТ РЕФЕРАЛЬНОЙ СИСТЕМЫ С ПРЯМОЙ РЕГИСТРАЦИЕЙ ===');
  
  // Создаем уникальные тестовые данные
  const testTelegramId = Math.floor(Date.now() / 1000); // Используем timestamp для уникальности
  const testUsername = `test_${testTelegramId}`;
  const refCode = 'REF_1752755835358_yjrusv'; // Код User 184
  
  console.log('🚀 Тестовые данные:');
  console.log(`   telegram_id: ${testTelegramId}`);
  console.log(`   username: ${testUsername}`);
  console.log(`   ref_code: ${refCode}`);
  
  try {
    // Проверяем, что сервер работает
    console.log('\n1. Проверка сервера...');
    
    const healthResponse = await fetch('http://localhost:3000/health');
    if (!healthResponse.ok) {
      console.log('❌ Сервер не отвечает');
      return;
    }
    
    console.log('✅ Сервер работает');
    
    // Используем прямую регистрацию для обхода Telegram валидации
    console.log('\n2. Прямая регистрация с реферальным кодом...');
    
    const authData = {
      direct_registration: true,
      telegram_id: testTelegramId,
      username: testUsername,
      first_name: "Test User",
      refBy: refCode
    };
    
    console.log('📤 Отправляем запрос с данными:');
    console.log(`   direct_registration: ${authData.direct_registration}`);
    console.log(`   telegram_id: ${authData.telegram_id}`);
    console.log(`   username: ${authData.username}`);
    console.log(`   refBy: ${authData.refBy}`);
    
    const authResponse = await fetch('http://localhost:3000/api/v2/auth/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authData)
    });
    
    console.log(`📥 Получен ответ: ${authResponse.status} ${authResponse.statusText}`);
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.log('❌ Ошибка auth endpoint:', errorText);
      return;
    }
    
    const authResult = await authResponse.json();
    console.log('📋 Результат аутентификации:');
    console.log(JSON.stringify(authResult, null, 2));
    
    if (!authResult.success) {
      console.log('❌ Аутентификация не удалась');
      return;
    }
    
    console.log(`✅ Аутентификация успешна! Новый пользователь создан: ${authResult.user?.id}`);
    
    // Проверяем результат в БД
    console.log('\n3. Проверка результата в БД...');
    
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, referred_by, created_at')
      .eq('telegram_id', testTelegramId)
      .single();
    
    if (userError) {
      console.log('❌ Ошибка поиска пользователя:', userError.message);
      return;
    }
    
    if (!newUser) {
      console.log('❌ Пользователь не найден в БД');
      return;
    }
    
    console.log('✅ Пользователь найден в БД:');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   telegram_id: ${newUser.telegram_id}`);
    console.log(`   username: ${newUser.username}`);
    console.log(`   referred_by: ${newUser.referred_by}`);
    console.log(`   created_at: ${newUser.created_at}`);
    
    // Проверяем referred_by
    if (newUser.referred_by === 184) {
      console.log('\n✅ УСПЕХ: referred_by установлен правильно (184)');
    } else if (newUser.referred_by === null) {
      console.log('\n❌ ПРОБЛЕМА: referred_by не установлен (null)');
      console.log('   Это означает, что processReferral() не был вызван или не сработал');
    } else {
      console.log(`\n⚠️  НЕОЖИДАННО: referred_by = ${newUser.referred_by}`);
    }
    
    // Проверяем запись в referrals
    console.log('\n4. Проверка записи в referrals...');
    
    const { data: referralRecord, error: referralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('user_id', newUser.id)
      .single();
    
    if (referralError && referralError.code !== 'PGRST116') {
      console.log('❌ Ошибка поиска referral:', referralError.message);
    } else if (!referralRecord) {
      console.log('❌ Запись в referrals не найдена');
    } else {
      console.log('✅ Запись в referrals найдена:');
      console.log(`   ID: ${referralRecord.id}`);
      console.log(`   user_id: ${referralRecord.user_id}`);
      console.log(`   inviter_id: ${referralRecord.inviter_id}`);
      console.log(`   level: ${referralRecord.level}`);
      console.log(`   created_at: ${referralRecord.created_at}`);
      
      // Проверяем временную синхронизацию
      const userTime = new Date(newUser.created_at);
      const referralTime = new Date(referralRecord.created_at);
      const timeDiff = Math.abs(referralTime - userTime);
      
      console.log(`   ⏱️  Разница во времени: ${timeDiff}ms`);
      
      if (timeDiff < 10000) { // 10 секунд
        console.log('   ✅ Записи созданы синхронно (разница < 10 сек)');
      } else {
        console.log('   ❌ Записи созданы с задержкой (разница > 10 сек)');
      }
    }
    
    // Проверяем правильность inviter_id
    if (referralRecord && referralRecord.inviter_id === 184) {
      console.log('   ✅ Inviter ID правильный (184)');
    } else if (referralRecord) {
      console.log(`   ❌ Inviter ID неправильный: ${referralRecord.inviter_id}`);
    }
    
    // Очищаем тестовые данные
    console.log('\n5. Очистка тестовых данных...');
    
    if (referralRecord) {
      await supabase.from('referrals').delete().eq('id', referralRecord.id);
      console.log('✅ Запись в referrals удалена');
    }
    
    await supabase.from('users').delete().eq('id', newUser.id);
    console.log('✅ Пользователь удален');
    
    console.log('\n=== ИТОГОВЫЙ РЕЗУЛЬТАТ ===');
    
    if (newUser.referred_by === 184 && referralRecord && referralRecord.inviter_id === 184) {
      console.log('🎉 ПОЛНЫЙ УСПЕХ: Реферальная система работает идеально!');
      console.log('   ✅ referred_by установлен правильно');
      console.log('   ✅ Запись в referrals создана');
      console.log('   ✅ inviter_id правильный');
      console.log('   ✅ Временная синхронизация в норме');
    } else if (newUser.referred_by === 184) {
      console.log('⚠️  ЧАСТИЧНЫЙ УСПЕХ: referred_by установлен, но проблемы с referrals');
    } else {
      console.log('❌ НЕУДАЧА: referred_by не установлен');
      console.log('   Проблема в вызове processReferral() или маппинге параметров');
    }
    
  } catch (error) {
    console.log('❌ Ошибка теста:', error.message);
    console.log('Stack trace:', error.stack);
  }
}

testReferralSystemDirect().catch(console.error);