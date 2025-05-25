import fetch from 'node-fetch';

/**
 * Тестирует API для активации фарминга с null user_id
 */
async function testFarmingDepositWithNull() {
  try {
    const baseUrl = 'https://uni-farm-connect-x-lukyanenkolawfa.replit.appsisko.replit.dev';
    const endpoint = '/api/uni-farming/deposit';
    const url = `${baseUrl}${endpoint}`;
    
    console.log(`Отправка POST запроса на ${url}`);
    
    // Тело запроса с null user_id
    const requestBody = {
      amount: "5",
      user_id: null
    };
    
    console.log('Тело запроса:', JSON.stringify(requestBody));
    
    // Выполняем запрос
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`Статус ответа: ${response.status} ${response.statusText}`);
    console.log('Заголовки ответа:', response.headers.raw());
    
    // Получаем тело ответа
    const responseText = await response.text();
    console.log('Тело ответа (текст):', responseText);
    
    if (responseText) {
      try {
        const responseJson = JSON.parse(responseText);
        console.log('Тело ответа (JSON):', JSON.stringify(responseJson, null, 2));
      } catch (error) {
        console.error('Ошибка парсинга JSON:', error);
      }
    } else {
      console.log('Получен пустой ответ от сервера');
    }
    
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
  }
}

// Запускаем тест
testFarmingDepositWithNull();