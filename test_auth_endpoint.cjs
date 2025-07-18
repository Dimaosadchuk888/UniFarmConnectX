// Тест endpoint авторизации для проверки работы processReferral
const https = require('https');
const http = require('http');
const crypto = require('crypto');

function generateFakeInitData(userId, username, refCode) {
  // Создаем фейковые данные для тестирования
  const user = {
    id: userId,
    first_name: "Test",
    last_name: "User",
    username: username,
    language_code: "en",
    allows_write_to_pm: true
  };
  
  const chatInstance = "-1234567890";
  const chatType = "private";
  const authDate = Math.floor(Date.now() / 1000);
  
  const initData = [
    `user=${encodeURIComponent(JSON.stringify(user))}`,
    `chat_instance=${chatInstance}`,
    `chat_type=${chatType}`,
    `auth_date=${authDate}`,
    `hash=fake_hash_for_testing`
  ].join('&');
  
  return initData;
}

async function testAuthEndpoint() {
  console.log('=== ТЕСТ AUTH ENDPOINT ===');
  
  // Проверяем доступность сервера
  console.log('1. Проверяем доступность сервера...');
  
  try {
    const healthResponse = await fetch('http://localhost:3000/api/v2/health');
    if (healthResponse.ok) {
      console.log('✅ Сервер доступен');
    } else {
      console.log('❌ Сервер недоступен, статус:', healthResponse.status);
      return;
    }
  } catch (error) {
    console.log('❌ Сервер недоступен:', error.message);
    return;
  }
  
  // Создаем тестовые данные
  const testUserId = Math.floor(Math.random() * 1000000000);
  const testUsername = `test_${Date.now()}`;
  const refCode = 'REF_1752755835358_yjrusv'; // Код User 184
  
  console.log('2. Создаем тестовые данные...');
  console.log('   Test User ID:', testUserId);
  console.log('   Test Username:', testUsername);
  console.log('   Ref Code:', refCode);
  
  const initData = generateFakeInitData(testUserId, testUsername, refCode);
  
  console.log('3. Отправляем запрос авторизации...');
  
  try {
    const response = await fetch('http://localhost:3000/api/v2/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'test-referral-system'
      },
      body: JSON.stringify({
        initData: initData,
        ref_by: refCode
      })
    });
    
    const result = await response.json();
    
    console.log('Статус ответа:', response.status);
    console.log('Результат:', JSON.stringify(result, null, 2));
    
    if (result.success && result.isNewUser) {
      console.log('✅ Новый пользователь создан через API');
      
      // Ждем немного для завершения processReferral
      console.log('4. Ожидаем завершения processReferral...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Проверяем результат в базе данных
      console.log('5. Проверяем результат в БД...');
      
      const { createClient } = require('@supabase/supabase-js');
      require('dotenv').config();
      
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
      
      // Ищем созданного пользователя
      const { data: createdUser } = await supabase
        .from('users')
        .select('id, telegram_id, username, referred_by, created_at')
        .eq('telegram_id', testUserId)
        .single();
      
      if (createdUser) {
        console.log('✅ Пользователь найден в БД:', createdUser);
        
        if (createdUser.referred_by === 184) {
          console.log('✅ referred_by правильно установлен на 184');
        } else {
          console.log('❌ referred_by НЕ установлен:', createdUser.referred_by);
        }
        
        // Проверяем запись в referrals
        const { data: referralRecord } = await supabase
          .from('referrals')
          .select('*')
          .eq('user_id', createdUser.id)
          .single();
        
        if (referralRecord) {
          console.log('✅ Запись в referrals создана:', referralRecord);
        } else {
          console.log('❌ Запись в referrals НЕ создана');
        }
        
        // Очищаем тестовые данные
        console.log('6. Очищаем тестовые данные...');
        await supabase.from('referrals').delete().eq('user_id', createdUser.id);
        await supabase.from('users').delete().eq('id', createdUser.id);
        console.log('✅ Тестовые данные очищены');
        
      } else {
        console.log('❌ Пользователь НЕ найден в БД');
      }
      
    } else {
      console.log('❌ Авторизация не удалась или пользователь не новый');
    }
    
  } catch (error) {
    console.error('❌ Ошибка запроса авторизации:', error.message);
  }
  
  console.log('\n=== ЗАКЛЮЧЕНИЕ ===');
  console.log('Этот тест показывает работает ли реферальная система в реальных условиях.');
  console.log('Если processReferral не сработал, проблема в auth/service.ts.');
}

testAuthEndpoint().catch(console.error);