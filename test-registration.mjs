import crypto from 'crypto';
import fetch from 'node-fetch';

// Генерируем уникальный guest_id для теста
function generateGuestId() {
  return crypto.randomUUID();
}

async function testGuestUserRegistration() {
  try {
    const guestId = generateGuestId();
    console.log('Тестирование регистрации с новым guest_id:', guestId);

    // Отправляем запрос на создание пользователя в режиме AirDrop
    const response = await fetch('http://localhost:3000/api/users/guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guest_id: guestId,
        username: 'test_user_' + Date.now().toString().slice(-4)
      })
    });

    const data = await response.json();
    console.log('Ответ API:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('✅ Пользователь успешно создан в режиме AirDrop');
      console.log('User ID:', data.user.id);
      console.log('Guest ID:', data.user.guest_id);
      console.log('Ref Code:', data.user.ref_code);
      console.log('Username:', data.user.username);
      console.log('Balance UNI:', data.user.balance_uni);
      console.log('Created at:', data.user.created_at);
    } else {
      console.log('❌ Ошибка при создании пользователя:', data.message);
    }
  } catch (error) {
    console.error('❌ Критическая ошибка при тестировании:', error);
  }
}

testGuestUserRegistration();
