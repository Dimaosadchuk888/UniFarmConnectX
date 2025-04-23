/**
 * Простой скрипт для тестирования новой функциональности реферальных кодов
 * Проверяет обработку реферального кода, переданного через новый параметр refCode
 */

import fetch from 'node-fetch';

async function testRefCodeFunctionality() {
  console.log('Тестирование улучшенной обработки реферальных кодов...');
  
  try {
    // Тестовые данные с refCode для нового пользователя
    const randomId = Math.floor(Math.random() * 1000000) + 100000; // Генерируем случайный ID, чтобы точно создался новый пользователь
    const testData = {
      authData: `query_id=AAHdF6IQAAAAAN0XohBk7MYo&user=%7B%22id%22%3A${randomId}%2C%22first_name%22%3A%22NewUser%22%2C%22username%22%3A%22new_test_user%22%7D&auth_date=1681234567&hash=11111111`,
      userId: randomId, // Гарантированно новый ID
      username: 'brand_new_user',
      firstName: 'Brand New User',
      refCode: 'ref_24fea103302b', // Реферальный код реального пользователя
      testMode: true // Включаем тестовый режим для обхода проверки подписи
    };
    
    console.log(`Тестируем с новым userId: ${randomId}`);
    
    // Отправляем запрос на аутентификацию с refCode
    const response = await fetch('http://localhost:5000/api/auth/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    const result = await response.json();
    
    console.log('Результат тестирования:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Тест УСПЕШНО завершен');
    } else {
      console.log('❌ Тест ПРОВАЛЕН');
      console.log('Причина:', result.message);
    }
  } catch (error) {
    console.error('❌ Тест ПРОВАЛЕН с ошибкой:', error);
  }
}

// Запускаем тест
testRefCodeFunctionality();