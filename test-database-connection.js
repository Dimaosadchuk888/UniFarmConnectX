/**
 * Тест для проверки фактического DATABASE_URL и регистрации пользователя
 */

import fetch from 'node-fetch';

async function testDatabaseConnection() {
  console.log('=== ТЕСТ ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ ===');
  
  const testUser = {
    telegram_id: 777000123,
    username: 'final_check_user',
    first_name: 'Final',
    last_name: 'Check',
    language_code: 'en',
    direct_registration: true
  };
  
  try {
    console.log('Отправляем запрос на регистрацию...');
    
    const response = await fetch('http://0.0.0.0:5000/api/v2/auth/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });
    
    console.log('Статус ответа:', response.status);
    
    const result = await response.json();
    console.log('Результат регистрации:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Пользователь зарегистрирован успешно');
      console.log('ID пользователя:', result.user?.id);
      console.log('Ref code:', result.user?.ref_code);
      console.log('JWT токен создан:', !!result.token);
    } else {
      console.log('❌ Ошибка регистрации:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Ошибка запроса:', error.message);
  }
}

testDatabaseConnection();