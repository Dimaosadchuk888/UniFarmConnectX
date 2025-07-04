import jwt from 'jsonwebtoken';

async function testMiddlewareDirectly() {
  console.log('🔧 ПРЯМОЕ ТЕСТИРОВАНИЕ MIDDLEWARE JWT ОБРАБОТКИ');
  
  const jwtSecret = process.env.JWT_SECRET || 'unifarm_jwt_secret_key_2025_production';
  
  // Создаём JWT токен для пользователя 61
  const testPayload = {
    userId: 61,
    telegram_id: 123456789,
    username: 'test_new_auth_user',
    ref_code: 'REF_test'
  };
  
  const testToken = jwt.sign(testPayload, jwtSecret, { expiresIn: '7d' });
  console.log('JWT токен для тестирования:', testToken.substring(0, 50) + '...');
  
  // Прямой вызов API с детальным логированием
  try {
    console.log('\n📡 Отправка запроса к /users/profile с Authorization header...');
    const response = await fetch('http://localhost:3000/api/v2/users/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log('❌ HTTP Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Response body:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('\n📊 Результат API /users/profile:');
    console.log('- Success:', result.success);
    console.log('- User ID в результате:', result.data?.user?.id);
    console.log('- Telegram ID в результате:', result.data?.user?.telegram_id);
    console.log('- Username:', result.data?.user?.username);
    
    if (result.data?.user?.id === 61) {
      console.log('\n✅ MIDDLEWARE ИСПРАВЛЕН! Теперь он использует правильный user_id из JWT');
    } else if (result.data?.user?.id === 48) {
      console.log('\n❌ Middleware всё ещё использует user_id=48');
      console.log('📋 Возможные причины:');
      console.log('1. Изменения middleware не вступили в силу (нужен полный перезапуск)');
      console.log('2. JWT токен не обрабатывается middleware (требует проверки логики)');
      console.log('3. Другой код overrides middleware результат');
    } else {
      console.log(`\n🔍 Неожиданный user_id: ${result.data?.user?.id}`);
    }
    
    // Дополнительный тест - проверим любой другой endpoint
    console.log('\n🧪 Тестируем другой endpoint /wallet/balance...');
    const balanceResponse = await fetch('http://localhost:3000/api/v2/wallet/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (balanceResponse.ok) {
      const balanceResult = await balanceResponse.json();
      console.log('Balance API user_id:', balanceResult.user_id);
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testMiddlewareDirectly().catch(console.error);