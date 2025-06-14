/**
 * Тест регистрации пользователя через API с production базой данных
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';
const TEST_USER = {
  telegram_id: 777000999,
  username: 'prod_test_check',
  first_name: 'Production',
  last_name: 'Test',
  direct_registration: true
};

async function testRegistration() {
  try {
    console.log('🧪 Тестирование регистрации через API /api/v2/register/telegram');
    console.log('📤 Отправляем данные:', TEST_USER);
    
    const response = await fetch(`${API_BASE}/api/v2/register/telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(TEST_USER)
    });
    
    const responseText = await response.text();
    console.log('📥 Статус ответа:', response.status, response.statusText);
    console.log('📄 Тело ответа:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Регистрация успешна:', {
        user_id: data.data?.user?.id,
        telegram_id: data.data?.user?.telegram_id,
        username: data.data?.user?.username,
        ref_code: data.data?.user?.ref_code,
        has_token: !!data.data?.token,
        is_new_user: data.data?.isNewUser
      });
      
      return data;
    } else {
      console.log('❌ Ошибка регистрации:', response.status, responseText);
      return null;
    }
    
  } catch (error) {
    console.error('💥 Ошибка при тестировании:', error.message);
    return null;
  }
}

// Запускаем тест
testRegistration().then(result => {
  if (result) {
    console.log('🎉 Тест завершен успешно');
  } else {
    console.log('💔 Тест не прошел');
  }
}).catch(console.error);