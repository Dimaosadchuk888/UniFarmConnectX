import crypto from 'crypto';
import fetch from 'node-fetch';

// Генерируем уникальный guest_id для теста
function generateGuestId() {
  return crypto.randomUUID();
}

// Получаем URL из окружения Replit
const baseUrl = 'https://8ac7b219-438d-4a0b-ab0e-d8b58de37c6d-00-8ncue1micrhz.sisko.replit.dev';

async function testAirdropRegistration() {
  try {
    // Генерируем уникальный guest_id
    const guestId = generateGuestId();
    console.log('Тестирование регистрации в режиме AirDrop с новым guest_id:', guestId);

    // Формируем запрос
    const response = await fetch(`${baseUrl}/api/airdrop/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guest_id: guestId,
        username: `test_user_${Date.now().toString().slice(-4)}`,
        airdrop_mode: true
      })
    });

    // Обрабатываем ответ
    const responseData = await response.json();
    console.log('Ответ API:', JSON.stringify(responseData, null, 2));

    if (responseData.success) {
      console.log('✅ Пользователь успешно создан в режиме AirDrop:');
      console.log('  ID:', responseData.data.user_id);
      console.log('  Guest ID:', responseData.data.guest_id);
      console.log('  Ref Code:', responseData.data.ref_code);
      console.log('  Username:', responseData.data.username);
      console.log('  Balance UNI:', responseData.data.balance_uni);
      console.log('  Created at:', responseData.data.created_at);
      console.log('  Is New User:', responseData.data.is_new_user);
    } else {
      console.log('❌ Ошибка при создании пользователя:', responseData.message);
      if (responseData.error) {
        console.log('  Детали ошибки:', responseData.error);
      }
    }

    // Пробуем получить созданного пользователя еще раз с тем же guest_id
    console.log('\nПроверка повторного запроса с тем же guest_id...');
    const repeatResponse = await fetch(`${baseUrl}/api/airdrop/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guest_id: guestId,
        airdrop_mode: true
      })
    });

    const repeatData = await repeatResponse.json();
    console.log('Ответ API при повторном запросе:', JSON.stringify(repeatData, null, 2));

    if (repeatData.success) {
      console.log('✅ Пользователь успешно найден по существующему guest_id:');
      console.log('  ID:', repeatData.data.user_id);
      console.log('  Is New User:', repeatData.data.is_new_user);
      
      // Проверяем, что это тот же пользователь (по ref_code)
      if (responseData.success && repeatData.data.ref_code === responseData.data.ref_code) {
        console.log('✅ Подтверждено: это тот же пользователь (ref_code совпадает)');
      } else {
        console.log('❌ Что-то не так: ref_code при повторном запросе отличается');
      }
    } else {
      console.log('❌ Ошибка при повторном запросе:', repeatData.message);
    }
  } catch (error) {
    console.error('❌ Критическая ошибка при тестировании:', error);
  }
}

// Запускаем тест
testAirdropRegistration();