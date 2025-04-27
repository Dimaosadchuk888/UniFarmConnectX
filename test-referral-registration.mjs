import crypto from 'crypto';
import fetch from 'node-fetch';

// Генерируем уникальный guest_id для теста
function generateGuestId() {
  return crypto.randomUUID();
}

// Получаем URL из окружения Replit
const baseUrl = 'https://8ac7b219-438d-4a0b-ab0e-d8b58de37c6d-00-8ncue1micrhz.sisko.replit.dev';

async function testReferralRegistration() {
  try {
    // Используем реферальный код существующего пользователя из предыдущего теста
    const existingRefCode = 'y4fv38yf';
    
    // Генерируем уникальный guest_id
    const guestId = generateGuestId();
    console.log(`Тестирование регистрации с реферальным кодом ${existingRefCode}:`);
    console.log('Guest ID:', guestId);

    // Формируем запрос
    const response = await fetch(`${baseUrl}/api/airdrop/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guest_id: guestId,
        username: `referral_user_${Date.now().toString().slice(-4)}`,
        parent_ref_code: existingRefCode, // Используем существующий ref_code как родительский
        airdrop_mode: true
      })
    });

    // Обрабатываем ответ
    const responseData = await response.json();
    console.log('Ответ API:', JSON.stringify(responseData, null, 2));

    if (responseData.success) {
      console.log('✅ Пользователь успешно создан с реферальной связью:');
      console.log('  ID:', responseData.data.user_id);
      console.log('  Guest ID:', responseData.data.guest_id);
      console.log('  Ref Code:', responseData.data.ref_code);
      console.log('  Parent Ref Code:', responseData.data.parent_ref_code);
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
  } catch (error) {
    console.error('❌ Критическая ошибка при тестировании:', error);
  }
}

// Запускаем тест
testReferralRegistration();