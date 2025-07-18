// Тест эндпоинта для диагностики реферальной системы
const fetch = require('node-fetch');

async function testReferralEndpoint() {
  console.log('=== ТЕСТ ЭНДПОИНТА ДИАГНОСТИКИ ===');
  
  const testTelegramId = Date.now();
  const testUsername = `test_${testTelegramId}`;
  const refCode = 'REF_1752755835358_yjrusv';
  
  console.log('🚀 Параметры теста:');
  console.log(`   telegram_id: ${testTelegramId}`);
  console.log(`   username: ${testUsername}`);
  console.log(`   refBy: ${refCode}`);
  
  try {
    // Отправляем запрос на регистрацию с детальным логированием
    console.log('\n📤 Отправка запроса на регистрацию...');
    
    const requestBody = {
      direct_registration: true,
      telegram_id: testTelegramId,
      username: testUsername,
      first_name: "Test User",
      refBy: refCode
    };
    
    console.log('📋 Тело запроса:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('http://localhost:3000/api/v2/auth/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`\n📥 Ответ сервера:`);
    console.log(`   Статус: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    const responseText = await response.text();
    console.log(`   Размер ответа: ${responseText.length} байт`);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('\n✅ Успешный парсинг JSON:');
      console.log(`   success: ${responseData.success}`);
      
      if (responseData.success) {
        console.log(`   user_id: ${responseData.data?.user?.id}`);
        console.log(`   username: ${responseData.data?.user?.username}`);
        console.log(`   referred_by: ${responseData.data?.user?.referred_by}`);
        console.log(`   isNewUser: ${responseData.data?.isNewUser}`);
        
        // Если создался пользователь, проверим в БД
        if (responseData.data?.user?.id) {
          console.log('\n🔍 Проверка в БД...');
          
          const { createClient } = require('@supabase/supabase-js');
          require('dotenv').config();
          
          const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
          
          // Проверяем пользователя
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, username, referred_by, created_at')
            .eq('id', responseData.data.user.id)
            .single();
          
          if (userError) {
            console.log('❌ Ошибка поиска пользователя в БД:', userError.message);
          } else {
            console.log(`✅ Пользователь в БД: ID=${user.id}, referred_by=${user.referred_by}`);
          }
          
          // Проверяем referrals
          const { data: referrals, error: referralError } = await supabase
            .from('referrals')
            .select('*')
            .eq('user_id', responseData.data.user.id);
          
          if (referralError) {
            console.log('❌ Ошибка поиска referrals в БД:', referralError.message);
          } else {
            console.log(`✅ Referrals в БД: ${referrals.length} записей`);
          }
          
          // Очистка
          console.log('\n🧹 Очистка данных...');
          await supabase.from('referrals').delete().eq('user_id', responseData.data.user.id);
          await supabase.from('users').delete().eq('id', responseData.data.user.id);
          console.log('✅ Данные очищены');
        }
      } else {
        console.log(`   error: ${responseData.error}`);
      }
    } catch (parseError) {
      console.log('❌ Ошибка парсинга JSON:', parseError.message);
      console.log('📄 Сырой ответ:', responseText.substring(0, 500));
    }
    
  } catch (error) {
    console.log('❌ Ошибка запроса:', error.message);
  }
}

testReferralEndpoint().catch(console.error);