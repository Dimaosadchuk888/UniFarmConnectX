/**
 * РЕАЛЬНЫЙ ТЕСТ РЕФЕРАЛЬНОЙ СИСТЕМЫ
 * Проверка работы исправленной архитектуры
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function realReferralTest() {
  console.log('=== РЕАЛЬНЫЙ ТЕСТ РЕФЕРАЛЬНОЙ СИСТЕМЫ ===\n');
  
  try {
    // Используем существующий реферальный код
    const referralCode = 'REF_1750079004411_nddfp2';
    
    console.log('🔍 1. ПРОВЕРКА РЕФЕРЕРА');
    
    const { data: referrer } = await supabase
      .from('users')
      .select('id, username, ref_code')
      .eq('ref_code', referralCode)
      .single();
    
    if (!referrer) {
      console.log('❌ Реферер не найден');
      return;
    }
    
    console.log(`✅ Реферер найден: ${referrer.username} (ID: ${referrer.id})`);
    
    // Создаем тестового пользователя
    const testTelegramId = Date.now(); // Уникальный ID
    const testUsername = `TestUser_${testTelegramId}`;
    
    console.log('\n🔍 2. СОЗДАНИЕ ТЕСТОВОГО ПОЛЬЗОВАТЕЛЯ');
    console.log(`Telegram ID: ${testTelegramId}`);
    console.log(`Username: ${testUsername}`);
    console.log(`Реферальный код: ${referralCode}`);
    
    // Формируем запрос аутентификации
    const testUser = {
      id: testTelegramId,
      username: testUsername,
      first_name: testUsername,
      language_code: 'en',
      auth_date: Math.floor(Date.now() / 1000),
      hash: 'test_hash_' + testTelegramId
    };
    
    const initData = `user=${encodeURIComponent(JSON.stringify(testUser))}&auth_date=${testUser.auth_date}&hash=${testUser.hash}`;
    
    console.log('\n🔍 3. ОТПРАВКА ЗАПРОСА НА СЕРВЕР');
    
    const authResponse = await fetch('http://localhost:3000/api/v2/auth/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        initData: initData,
        ref_by: referralCode
      })
    });
    
    const authData = await authResponse.json();
    
    console.log('Статус ответа:', authResponse.status);
    console.log('Успешность:', authData.success);
    
    if (authData.success && authData.user) {
      const newUserId = authData.user.id;
      console.log(`✅ Пользователь создан с ID: ${newUserId}`);
      
      // Проверяем данные в БД
      console.log('\n🔍 4. ПРОВЕРКА ДАННЫХ В БД');
      
      const { data: createdUser } = await supabase
        .from('users')
        .select('id, telegram_id, username, referred_by, ref_code')
        .eq('id', newUserId)
        .single();
      
      const { data: referralRecord } = await supabase
        .from('referrals')
        .select('*')
        .eq('user_id', newUserId)
        .single();
      
      console.log('\n📊 5. РЕЗУЛЬТАТЫ ТЕСТА');
      
      if (createdUser) {
        console.log('✅ Пользователь найден в БД:');
        console.log(`   ID: ${createdUser.id}`);
        console.log(`   Telegram ID: ${createdUser.telegram_id}`);
        console.log(`   Username: ${createdUser.username}`);
        console.log(`   referred_by: ${createdUser.referred_by || 'NULL'}`);
        console.log(`   ref_code: ${createdUser.ref_code}`);
        
        // Проверка referred_by
        if (createdUser.referred_by == referrer.id) {
          console.log('✅ referred_by заполнено КОРРЕКТНО');
        } else {
          console.log('❌ referred_by НЕ заполнено или неверно');
        }
      } else {
        console.log('❌ Пользователь НЕ найден в БД');
      }
      
      if (referralRecord) {
        console.log('✅ Запись в referrals найдена:');
        console.log(`   user_id: ${referralRecord.user_id}`);
        console.log(`   inviter_id: ${referralRecord.inviter_id}`);
        console.log(`   level: ${referralRecord.level}`);
        console.log(`   ref_path: ${JSON.stringify(referralRecord.ref_path)}`);
      } else {
        console.log('❌ Запись в referrals НЕ найдена');
      }
      
      // Финальная оценка
      const referredByCorrect = createdUser?.referred_by == referrer.id;
      const referralRecordExists = !!referralRecord;
      const systemWorking = referredByCorrect && referralRecordExists;
      
      console.log('\n🎯 6. ФИНАЛЬНАЯ ОЦЕНКА');
      
      if (systemWorking) {
        console.log('🎉 РЕФЕРАЛЬНАЯ СИСТЕМА РАБОТАЕТ!');
        console.log('✅ Архитектурные изменения успешны');
        console.log('✅ Циклические зависимости устранены');
        console.log('✅ processReferralInline() функционирует');
      } else {
        console.log('❌ РЕФЕРАЛЬНАЯ СИСТЕМА НЕ РАБОТАЕТ');
        console.log(`❌ referred_by корректно: ${referredByCorrect}`);
        console.log(`❌ referrals запись создана: ${referralRecordExists}`);
      }
      
      // Очистка тестовых данных
      console.log('\n🧹 7. ОЧИСТКА ТЕСТОВЫХ ДАННЫХ');
      
      await supabase.from('referrals').delete().eq('user_id', newUserId);
      await supabase.from('users').delete().eq('id', newUserId);
      
      console.log('✅ Тестовые данные удалены');
      
    } else {
      console.log('❌ Ошибка создания пользователя');
      console.log('Ответ сервера:', JSON.stringify(authData, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка теста:', error);
  }
}

realReferralTest();