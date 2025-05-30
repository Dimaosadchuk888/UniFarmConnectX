
console.log('🔍 ТЕСТ TELEGRAM АВТОРИЗАЦИИ');

async function testTelegramAuth() {
  const baseUrl = 'https://uni-farm-connect-xo-osadchukdmitro2.replit.app';
  
  console.log('\n📡 Этап 1: Тестирование API endpoints');
  
  // 1. Тест /api/v2/me без авторизации
  try {
    const response = await fetch(`${baseUrl}/api/v2/me`);
    console.log(`✅ /api/v2/me статус: ${response.status}`);
    if (response.status !== 401) {
      console.log('❌ Ожидался статус 401 (Unauthorized)');
    }
  } catch (error) {
    console.log('❌ Ошибка при тестировании /api/v2/me:', error.message);
  }
  
  // 2. Тест валидации initData endpoint
  try {
    const response = await fetch(`${baseUrl}/api/auth/validate-init-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: 'test_data' })
    });
    console.log(`✅ Валидация initData статус: ${response.status}`);
  } catch (error) {
    console.log('❌ Endpoint валидации не найден или недоступен');
  }
  
  // 3. Тест регистрации через guest_id
  try {
    const testGuestId = 'test-guest-' + Date.now();
    const response = await fetch(`${baseUrl}/api/register/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        guest_id: testGuestId,
        ref_code: null 
      })
    });
    console.log(`✅ Регистрация guest статус: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Пользователь создан:', data.user?.id);
    }
  } catch (error) {
    console.log('❌ Ошибка регистрации guest:', error.message);
  }
  
  console.log('\n🤖 Этап 2: Проверка Telegram Bot');
  
  // Проверка статуса бота
  try {
    const response = await fetch(`${baseUrl}/api/telegram/bot-info`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Бот активен:', data.username);
    } else {
      console.log('❌ Бот недоступен');
    }
  } catch (error) {
    console.log('❌ Ошибка проверки бота:', error.message);
  }
  
  console.log('\n💾 Этап 3: Проверка базы данных');
  
  // Проверка подключения к БД
  try {
    const response = await fetch(`${baseUrl}/api/admin/db-status`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ БД подключена:', data.isConnected);
      console.log('✅ Пользователей в БД:', data.tables?.users || 'неизвестно');
    }
  } catch (error) {
    console.log('❌ Ошибка проверки БД:', error.message);
  }
  
  console.log('\n🎮 Этап 4: Тестирование функций');
  
  // Тест миссий
  try {
    const response = await fetch(`${baseUrl}/api/v2/missions/active`);
    console.log(`✅ Миссии статус: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Активных миссий: ${data.data?.length || 0}`);
    }
  } catch (error) {
    console.log('❌ Ошибка получения миссий:', error.message);
  }
  
  console.log('\n🏁 Тест завершен!');
}

testTelegramAuth().catch(console.error);
