// Тест для проверки логов console.log
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testDebugLogs() {
  console.log('=== ТЕСТ ЛОГОВ ===');
  
  const testTelegramId = Date.now();
  const testUsername = `test_${testTelegramId}`;
  const refCode = 'REF_1752755835358_yjrusv';
  
  console.log('🚀 Тестовые данные:');
  console.log(`   telegram_id: ${testTelegramId}`);
  console.log(`   username: ${testUsername}`);
  console.log(`   ref_code: ${refCode}`);
  
  const authData = {
    direct_registration: true,
    telegram_id: testTelegramId,
    username: testUsername,
    first_name: "Test User",
    refBy: refCode
  };
  
  try {
    console.log('\n📤 Отправка запроса...');
    
    const authResponse = await fetch('http://localhost:3000/api/v2/auth/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authData)
    });
    
    console.log(`📥 Ответ: ${authResponse.status} ${authResponse.statusText}`);
    
    if (authResponse.ok) {
      const result = await authResponse.json();
      console.log('✅ Успешный ответ');
      console.log(`   user_id: ${result.data.user.id}`);
      console.log(`   referred_by: ${result.data.user.referred_by}`);
      
      // Очистка
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
      await supabase.from('users').delete().eq('id', result.data.user.id);
      console.log('✅ Пользователь удален');
    } else {
      const error = await authResponse.text();
      console.log('❌ Ошибка:', error);
    }
  } catch (error) {
    console.log('❌ Ошибка запроса:', error.message);
  }
  
  console.log('\n=== ПРОВЕРЬТЕ ЛОГИ СЕРВЕРА ===');
  console.log('Ищите сообщения:');
  console.log('- 🎯 НАЧИНАЮ обработку реферальной связи');
  console.log('- 🎯 РЕЗУЛЬТАТ processReferral');
  console.log('- 🎯 ОШИБКА при обработке');
  console.log('- 🎯 ПРОПУСК реферальной обработки');
}

testDebugLogs().catch(console.error);