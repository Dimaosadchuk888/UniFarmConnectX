/**
 * Простой скрипт для тестирования новой функциональности реферальных кодов
 * Проверяет обработку реферального кода, переданного через новый параметр refCode
 */

const fetch = require('node-fetch');

async function testRefCodeFunctionality() {
  console.log('Тестирование улучшенной обработки реферальных кодов...');
  
  try {
    // Тестовые данные с refCode
    const testData = {
      authData: 'query_id=AAHdF6IQAAAAAN0XohBk7MYo&user=%7B%22id%22%3A1%2C%22first_name%22%3A%22Test%22%2C%22username%22%3A%22test_user%22%7D&auth_date=1681234567&hash=11111111',
      userId: 1,
      username: 'test_user',
      firstName: 'Test User',
      refCode: 'ref_abcdef123456', // Реферальный код в новом формате
      testMode: true // Включаем тестовый режим для обхода проверки подписи
    };
    
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