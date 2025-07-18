/**
 * ТЕСТ С BYPASS АВТОРИЗАЦИИ
 * Прямой вызов AuthService для тестирования processReferralInline
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testAuthBypass() {
  console.log('=== ТЕСТ С BYPASS АВТОРИЗАЦИИ ===\n');
  
  try {
    // Создаем тестовые данные
    const testTelegramId = Date.now();
    const testUsername = `BypassTest_${testTelegramId}`;
    const referralCode = 'REF_1750079004411_nddfp2';
    
    console.log('🔍 1. ПОДГОТОВКА ТЕСТА');
    console.log(`Telegram ID: ${testTelegramId}`);
    console.log(`Username: ${testUsername}`);
    console.log(`Реферальный код: ${referralCode}`);
    
    // Вызываем API с bypass параметром
    console.log('\n🔍 2. ВЫЗОВ API С BYPASS');
    
    const requestData = {
      initData: 'bypass_for_testing',
      ref_by: referralCode,
      telegram_id: testTelegramId,
      username: testUsername,
      first_name: testUsername
    };
    
    console.log('Отправляем запрос...');
    
    const response = await fetch('http://localhost:3000/api/v2/auth/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    const data = await response.json();
    
    console.log('Статус ответа:', response.status);
    console.log('Ответ:', JSON.stringify(data, null, 2));
    
    if (data.success && data.user) {
      const newUserId = data.user.id;
      console.log(`✅ Пользователь создан с ID: ${newUserId}`);
      
      // Проверяем результат в БД
      console.log('\n🔍 3. ПРОВЕРКА РЕЗУЛЬТАТА В БД');
      
      const { data: createdUser } = await supabase
        .from('users')
        .select('id, telegram_id, username, referred_by')
        .eq('id', newUserId)
        .single();
      
      const { data: referralRecord } = await supabase
        .from('referrals')
        .select('*')
        .eq('user_id', newUserId)
        .single();
      
      console.log('Пользователь в БД:', createdUser);
      console.log('Реферальная запись:', referralRecord);
      
      // Проверяем логи сервера
      console.log('\n🔍 4. ПРОВЕРКА ЛОГОВ СЕРВЕРА');
      console.log('Ищем логи с нашим testTelegramId в серверных логах...');
      
      // Оценка
      console.log('\n🎯 5. ОЦЕНКА РЕЗУЛЬТАТА');
      
      const referredByCorrect = createdUser?.referred_by == 25; // ID реферера
      const referralExists = !!referralRecord;
      
      if (referredByCorrect && referralExists) {
        console.log('🎉 ТЕСТ УСПЕШЕН! processReferralInline РАБОТАЕТ!');
      } else {
        console.log('❌ ТЕСТ НЕ ПРОЙДЕН');
        console.log(`   referred_by корректно: ${referredByCorrect}`);
        console.log(`   referral запись создана: ${referralExists}`);
      }
      
      // Очистка
      await supabase.from('referrals').delete().eq('user_id', newUserId);
      await supabase.from('users').delete().eq('id', newUserId);
      
    } else {
      console.log('❌ Ошибка создания пользователя');
      
      // Все равно проверим логи
      console.log('\n🔍 ПРОВЕРКА ЛОГОВ ПОСЛЕ ОШИБКИ');
      console.log('Ищем упоминания нашего testTelegramId или bypass...');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка теста:', error);
  }
}

testAuthBypass();