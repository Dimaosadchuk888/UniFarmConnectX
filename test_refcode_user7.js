/**
 * Скрипт для проверки реферального кода пользователя с ID=7
 */
import fetch from 'node-fetch';

async function checkReferralCodeForUser7() {
  try {
    console.log('Запуск проверки реферального кода для пользователя ID=7...');
    
    // 1. Получаем текущий реферальный код
    const currentCodeResponse = await fetch('http://localhost:5000/api/admin/update-user-ref-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: 7 })
    });
    
    if (!currentCodeResponse.ok) {
      const errorText = await currentCodeResponse.text();
      throw new Error(`Ошибка при получении текущего реферального кода: ${errorText}`);
    }
    
    const currentCodeData = await currentCodeResponse.json();
    console.log('Проверка текущего кода:', currentCodeData);
    
    // 2. Получаем данные реферальной структуры для ID=7
    const referralResponse = await fetch('http://localhost:5000/api/referrals?user_id=7');
    
    if (!referralResponse.ok) {
      const errorText = await referralResponse.text();
      throw new Error(`Ошибка при получении реферальных данных: ${errorText}`);
    }
    
    const referralData = await referralResponse.json();
    console.log('\nДанные о рефералах:');
    console.log(JSON.stringify(referralData, null, 2));
    
    // Формируем реферальную ссылку
    const refCode = currentCodeData.data.oldRefCode || currentCodeData.data.newRefCode;
    if (refCode) {
      const refLink = `https://t.me/your_bot_username?start=${refCode}`;
      console.log('\nРеферальная ссылка:', refLink);
    } else {
      console.log('\nНе удалось сформировать реферальную ссылку: реферальный код отсутствует');
    }
    
    return {
      success: true,
      refCode,
      referralData
    };
  } catch (error) {
    console.error('Ошибка при проверке реферального кода:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Запускаем проверку
checkReferralCodeForUser7().then(result => {
  console.log('\nРезультат проверки:', result.success ? 'Успешно' : 'Ошибка');
  if (!result.success) {
    console.error(result.error);
    process.exit(1);
  }
});